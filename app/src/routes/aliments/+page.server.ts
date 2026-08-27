import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch('/api/v1/foods');
	const { foods } = await response.json();

	return { foods };
};
