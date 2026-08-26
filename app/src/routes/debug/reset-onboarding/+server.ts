import { error, redirect, type RequestHandler } from '@sveltejs/kit';
import { resetCatsForUser } from '$lib/server/services/cat.service';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	await resetCatsForUser(locals.user.id);

	redirect(303, '/onboarding/chat');
};
