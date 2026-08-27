import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from './db';

// L'app mobile (client React Native natif, pas de webview) s'authentifie via `Authorization: Bearer
// <token>` plutôt que par cookie de session — voir plugin `bearer` ci-dessous. `MOBILE_APP_ORIGINS`
// liste les origines autorisées à requêter l'API pendant le dev (émulateur Android, device physique
// sur le LAN) ; en prod le mobile ne dépend d'aucune origine web.
const mobileAppOrigins = (process.env.MOBILE_APP_ORIGINS ?? '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true
	},
	trustedOrigins: mobileAppOrigins,
	// `bearer` doit précéder `sveltekitCookies` : ce dernier doit rester le dernier plugin du tableau
	// (contrainte documentée par Better Auth) pour pouvoir écrire les cookies de session web en sortie.
	plugins: [bearer(), sveltekitCookies(getRequestEvent)]
});
