import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch('/api/foods');
	const { foods } = await response.json();

	return { foods };
};
