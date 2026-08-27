// Miroir du contrat REST better-auth utilisé par le mobile (voir app/src/lib/server/auth.ts, plugin
// `bearer`) : le token de session est renvoyé dans l'en-tête de réponse `set-auth-token`, jamais dans
// le corps JSON — le corps n'est utile côté client que pour lire un message d'erreur.

export interface AuthErrorResponse {
	message?: string;
	error?: string;
}

export interface SignInEmailInput {
	email: string;
	password: string;
}

export interface SignUpEmailInput {
	email: string;
	password: string;
	name: string;
}
