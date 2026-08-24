import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const catsResponse = await fetch('/api/cats');
	const { cats } = await catsResponse.json();

	if (cats.length === 0) {
		return { cats, activeCatId: null, dailyPlans: [] };
	}

	const requestedCatId = url.searchParams.get('catId');
	const activeCatId = cats.some((c: { id: string }) => c.id === requestedCatId)
		? requestedCatId
		: cats[0].id;

	const dailyPlansResponse = await fetch(`/api/daily-plans?catId=${activeCatId}`);
	const { dailyPlans } = await dailyPlansResponse.json();

	return { cats, activeCatId, dailyPlans };
};
