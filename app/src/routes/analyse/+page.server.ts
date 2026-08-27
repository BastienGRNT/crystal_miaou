import type { PageServerLoad } from './$types';
import type { AnalyseOkResponse } from '$lib/components/organisms/AnalyseEvolution.svelte';

interface CatRecord {
	id: string;
	name: string;
}

const DAYS_DEFAUT = 14;

export const load: PageServerLoad = async ({ fetch, url }) => {
	const catsResponse = await fetch('/api/v1/cats');
	const { cats } = (await catsResponse.json()) as { cats: CatRecord[] };

	if (cats.length === 0) {
		return { cats, activeCatId: null, days: DAYS_DEFAUT, analyse: null, analyseError: null };
	}

	const requestedCatId = url.searchParams.get('catId');
	const activeCatId = cats.find((c) => c.id === requestedCatId)?.id ?? cats[0].id;

	const requestedDays = Number(url.searchParams.get('days'));
	const days = Number.isFinite(requestedDays) && requestedDays > 0 ? requestedDays : DAYS_DEFAUT;

	const analyseResponse = await fetch(`/api/v1/analyse?catId=${activeCatId}&days=${days}`);
	const body = await analyseResponse.json();

	let analyse: AnalyseOkResponse | null = null;
	let analyseError: string | null = null;
	if (analyseResponse.ok) {
		analyse = body;
	} else {
		analyseError = body.error ?? "Impossible de charger l'analyse.";
	}

	return { cats, activeCatId, days, analyse, analyseError };
};
