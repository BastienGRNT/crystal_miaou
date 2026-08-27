import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, locals }) => {
	const response = await fetch('/api/v1/cats');
	const { cats } = await response.json();

	return { cats, currentUserId: locals.user!.id };
};
