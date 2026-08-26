import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [catsResponse, foodsResponse] = await Promise.all([fetch('/api/cats'), fetch('/api/foods')]);
	const { cats } = await catsResponse.json();
	const { foods } = await foodsResponse.json();

	return { cats, foods };
};
