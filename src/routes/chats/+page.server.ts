import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch('/api/cats');
	const { cats } = await response.json();

	return { cats };
};
