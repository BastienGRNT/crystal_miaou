import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Équivalent TS de flutter_mobile/lib/core/api_client.dart — client HTTP unique de l'app, aucune
// logique métier ici, uniquement des appels REST vers `/api/...` avec le token bearer Better Auth
// (CLAUDE.md : mobile = "client pur de l'API de app/"). Base URL résolue par app.config.ts (extra.apiBaseUrl).

const API_BASE_URL: string = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://10.0.2.2:5173';

const TOKEN_KEY = 'auth_bearer_token';

export class ApiError extends Error {
	constructor(
		public statusCode: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export async function getToken(): Promise<string | null> {
	return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
	await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
	await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authHeaders(json: boolean): Promise<Record<string, string>> {
	const token = await getToken();
	return {
		...(json ? { 'Content-Type': 'application/json' } : {}),
		...(token ? { Authorization: `Bearer ${token}` } : {})
	};
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
	const url = new URL(path, API_BASE_URL);
	if (query) {
		for (const [key, value] of Object.entries(query)) {
			if (value !== undefined) url.searchParams.set(key, String(value));
		}
	}
	return url.toString();
}

async function decode(response: Response): Promise<unknown> {
	const text = await response.text();
	const decoded: unknown = text.length === 0 ? null : JSON.parse(text);
	if (!response.ok) {
		const message =
			decoded !== null && typeof decoded === 'object' && 'error' in decoded && typeof (decoded as { error: unknown }).error === 'string'
				? (decoded as { error: string }).error
				: `Erreur ${response.status}`;
		throw new ApiError(response.status, message);
	}
	return decoded;
}

export async function apiGet<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
	const response = await fetch(buildUrl(path, query), { headers: await authHeaders(false) });
	return decode(response) as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
	const response = await fetch(buildUrl(path), {
		method: 'POST',
		headers: await authHeaders(true),
		body: JSON.stringify(body ?? {})
	});
	return decode(response) as Promise<T>;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
	const response = await fetch(buildUrl(path), {
		method: 'PATCH',
		headers: await authHeaders(true),
		body: JSON.stringify(body ?? {})
	});
	return decode(response) as Promise<T>;
}

export async function apiDelete<T>(path: string, body?: unknown): Promise<T> {
	const response = await fetch(buildUrl(path), {
		method: 'DELETE',
		headers: await authHeaders(body !== undefined),
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	return decode(response) as Promise<T>;
}

/** Envoi multipart (scan d'étiquette) — pas de `Content-Type` manuel : `fetch` le fixe lui-même
 * (boundary inclus) dès que le body est un `FormData`. */
export async function apiPostMultipart<T>(path: string, formData: FormData): Promise<T> {
	const token = await getToken();
	const response = await fetch(buildUrl(path), {
		method: 'POST',
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
		body: formData
	});
	return decode(response) as Promise<T>;
}

/** Requêtes d'auth better-auth (sign-in/sign-up) : pas de token à envoyer, mais le token de session
 * renvoyé est dans l'en-tête `set-auth-token` (jamais le corps JSON) — voir app/src/lib/server/auth.ts,
 * plugin `bearer`. */
export async function authRequest(path: string, body: Record<string, string>): Promise<void> {
	const response = await fetch(buildUrl(path), {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const text = await response.text();
		const decoded: unknown = text.length === 0 ? null : JSON.parse(text);
		const message =
			decoded !== null && typeof decoded === 'object' && 'message' in decoded && typeof (decoded as { message: unknown }).message === 'string'
				? (decoded as { message: string }).message
				: 'Échec de connexion.';
		throw new ApiError(response.status, message);
	}

	const token = response.headers.get('set-auth-token');
	if (!token) {
		throw new ApiError(response.status, "Le serveur n'a pas renvoyé de token (plugin bearer absent ?).");
	}
	await setToken(token);
}

export { API_BASE_URL };
