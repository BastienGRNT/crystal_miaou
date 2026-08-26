import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';

const PUBLIC_PATHS = new Set(['/login', '/register']);

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	const isPublic =
		PUBLIC_PATHS.has(event.url.pathname) || event.url.pathname.startsWith('/api/auth');

	if (!isPublic && !event.locals.user) {
		redirect(303, '/login');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
