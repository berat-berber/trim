type ShortUrlResult = {
	shortCode: string;
	originalUrl: string;
	createdAt: string;
	expiresAt: string | null;
};

type ProblemDetails = {
	type?: string;
	title?: string;
	status?: number;
	detail?: string;
	errors?: Record<string, string[]>;
};

const apiBase = import.meta.env.PUBLIC_API_URL as string | undefined;

const form = document.querySelector<HTMLFormElement>('#shorten-form')!;
const input = document.querySelector<HTMLInputElement>('#url-input')!;
const button = document.querySelector<HTMLButtonElement>('#shorten-btn')!;
const resultEl = document.querySelector<HTMLDivElement>('#result')!;
const shortLink = document.querySelector<HTMLAnchorElement>('#short-link')!;
const originalUrlEl = document.querySelector<HTMLElement>('#original-url')!;
const expiryEl = document.querySelector<HTMLElement>('#expiry')!;
const errorEl = document.querySelector<HTMLParagraphElement>('#error')!;

form.addEventListener('submit', async (event) => {
	event.preventDefault();
	hideError();
	resultEl.hidden = true;

	const originalUrl = input.value.trim();
	if (!originalUrl) return;

	if (!apiBase) {
		showError('This deployment is missing its PUBLIC_API_URL configuration.');
		return;
	}

	setLoading(true);

	try {
		const response = await fetch(`${apiBase}/api/urls`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ originalUrl }),
		});

		if (!response.ok) {
			const problem = (await response.json().catch(() => null)) as ProblemDetails | null;
			showError(problem?.title ?? `Something went wrong (HTTP ${response.status}).`);
			return;
		}

		const data = (await response.json()) as ShortUrlResult;
		const link = `${apiBase}/api/urls/${data.shortCode}`;
		shortLink.href = link;
		shortLink.textContent = link;
		originalUrlEl.textContent = data.originalUrl;
		expiryEl.textContent = data.expiresAt
			? new Date(data.expiresAt).toLocaleString()
			: 'Never';
		resultEl.hidden = false;
	} catch {
		showError('Could not reach the API. Is the gateway running?');
	} finally {
		setLoading(false);
	}
});

function setLoading(loading: boolean): void {
	button.disabled = loading;
	input.disabled = loading;
	button.setAttribute('aria-busy', String(loading));
	button.replaceChildren();

	if (loading) {
		const spinner = document.createElement('span');
		spinner.className = 'spinner';
		spinner.setAttribute('aria-hidden', 'true');
		button.append(spinner, 'Shortening…');
	} else {
		button.textContent = 'Shorten';
	}
}

function showError(message: string): void {
	errorEl.textContent = message;
	errorEl.hidden = false;
}

function hideError(): void {
	errorEl.hidden = true;
	errorEl.textContent = '';
}
