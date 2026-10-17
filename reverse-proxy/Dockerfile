FROM node:22-alpine AS build
WORKDIR /app
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
# Baked into the static bundle at build time (nothing reads env at runtime).
ARG PUBLIC_API_URL=http://localhost
ENV PUBLIC_API_URL=$PUBLIC_API_URL
RUN npm run build

FROM nginx:stable-alpine
COPY reverse-proxy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
