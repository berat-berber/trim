# trim

A minimal URL shortener MVP: a web client, two API services, and an API gateway in front of PostgreSQL.

## Architecture

```
Browser
   │
   ▼
┌───────────────┐   /api/urls (POST)      ┌────────────────┐
│  NGINX        │ ───────────────────────▶│  write-service │
│  gateway      │                         │  (.NET, EF)    │
│  (serves the  │   /api/urls/{code} GET  ┌────────────────┐
│  Astro client │ ───────────────────────▶│  read-service  │
│  statically)  │                         │  (.NET, Dapper)│
└───────────────┘                         └───────┬────────┘
                                                  │
                                             ┌────▼────┐
                                             │PostgreSQL│
                                             └─────────┘
```

| Component     | Role                                                                 |
|---------------|----------------------------------------------------------------------|
| `gateway`     | NGINX — serves the built client and routes `/api/urls` by method     |
| `write-service` | .NET 10 + EF Core — creates short URLs (`POST /api/urls`)           |
| `read-service`  | .NET 10 + Dapper — resolves short codes to 302 redirects            |
| `client`      | Astro (TypeScript) — static UI, built into the gateway image         |
| `postgres`    | Single `short_urls` table, schema auto-applied on first boot         |

Request flow:

- `POST /api/urls` with `{ "originalUrl": "..." , "expiresAt": "..."? }` → `201` + the created record `{ shortCode, originalUrl, createdAt, expiresAt }`. Expiry defaults to now + 24 hours.
- `GET /api/urls/{shortCode}` → `302` redirect to the original URL, or `404` when unknown/expired.
- Errors follow [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`).

## Running with Docker

Prerequisites: Docker with Compose.

### Local development

```bash
docker compose up --build -d
```

Then open [http://localhost](http://localhost).

Services listen on a private network; only the gateway is exposed on `:80` (client page + API). Postgres is not published to the host.

### Production

The two API service images are built and pushed to the GitHub Container Registry by CI (`.github/workflows/publish-services.yml`, on every push to `main` that touches `services/**`):

| Image | Built |
|---|---|
| `ghcr.io/berat-berber/trim-write-service` | CI (GHCR) |
| `ghcr.io/berat-berber/trim-read-service` | CI (GHCR) |
| reverse-proxy (nginx + Astro client) | always built on the host |

The gateway image is never pulled: `PUBLIC_API_URL` is baked into the static Astro bundle at build time, so it has to be rebuilt against the target environment's `.env` on every deploy. The packages are public, so no registry login is required to pull.

Deploy on the server (after `git pull`):

```bash
docker compose -f compose.prod.yml pull --ignore-buildable
docker compose -f compose.prod.yml up -d --build
```

`--ignore-buildable` skips the gateway during `pull` (it has no `image:`, only `build:`); `--build` rebuilds it.

### Config

- `PUBLIC_API_URL` (gateway build arg, default `http://localhost`) — base URL the browser uses for API calls. Override it when deploying so the client calls the API on the origin the page is served from, e.g. `PUBLIC_API_URL=https://your-domain docker compose up --build -d` (production reads it from `.env`).
- Database connection strings are injected into the .NET services via `ConnectionStrings__devDatabase`.
- Local dev: copy `client/.env.example` to `client/.env` for the Astro dev server.

## Local development (without Docker)

- Postgres: `docker run -d --name url-shortener-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=urlshortener -p 5432:5432 -v "$PWD/database/schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro" postgres:17-alpine`
- Write service: `dotnet run --project services/writeService/src --urls http://0.0.0.0:5047`
- Read service: `dotnet run --project services/readService/src --urls http://0.0.0.0:5291`
- Client: `npm install && npm run dev` in `client/`
- For a host-mode gateway, use `gateway/nginx.conf` with upstreams pointed at `host.docker.internal:<port>` (the committed config targets compose service names).
