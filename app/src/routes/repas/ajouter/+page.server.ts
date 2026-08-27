import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const [catsResponse, foodsResponse] = await Promise.all([fetch('/api/v1/cats'), fetch('/api/v1/foods')]);
	const { cats } = await catsResponse.json();
	const { foods } = await foodsResponse.json();

	return { cats, foods };
};
