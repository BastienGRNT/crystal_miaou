import type { PageServerLoad } from './$types';
import type { DailyLogOkResponse } from '$lib/components/organisms/DailyLogView.svelte';

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function isValidIsoDate(value: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

interface CatRecord {
	id: string;
	name: string;
	activeCroquetteFoodId: string | null;
	activePateeFoodId: string | null;
	activeFriandiseFoodId: string | null;
	friandiseQuantiteTotaleG: string | null;
}

interface DailyPlanRecord {
	id: string;
	name: string;
	isActive: boolean;
}

export const load: PageServerLoad = async ({ fetch, url }) => {
	const catsResponse = await fetch('/api/v1/cats');
	const { cats } = (await catsResponse.json()) as { cats: CatRecord[] };

	const today = todayIsoDate();

	if (cats.length === 0) {
		return {
			cats,
			activeCat: null,
			activeCatId: null,
			date: today,
			today,
			isToday: true,
			foods: [],
			dailyPlans: [],
			repartition: null,
			repartitionError: null,
			dailyLog: null,
			dailyLogError: null
		};
	}

	const requestedCatId = url.searchParams.get('catId');
	const activeCat = cats.find((c) => c.id === requestedCatId) ?? cats[0];
	const activeCatId = activeCat.id;

	const requestedDate = url.searchParams.get('date');
	// Jamais dans le futur : on ne peut pas consulter un menu qui n'a pas encore été généré.
	const date = requestedDate && isValidIsoDate(requestedDate) && requestedDate <= today ? requestedDate : today;
	const isToday = date === today;

	const [foodsResponse, dailyPlansResponse] = await Promise.all([
		fetch('/api/v1/foods'),
		fetch(`/api/v1/daily-plans?catId=${activeCatId}`)
	]);

	const { foods } = await foodsResponse.json();
	const { dailyPlans } = (await dailyPlansResponse.json()) as { dailyPlans: DailyPlanRecord[] };

	const hasActiveFood = Boolean(activeCat.activeCroquetteFoodId || activeCat.activePateeFoodId);
	const hasActiveRoutine = dailyPlans.some((plan) => plan.isActive);

	let repartition = null;
	let repartitionError: string | null = null;
	let dailyLog: DailyLogOkResponse | null = null;
	let dailyLogError: string | null = null;

	if (isToday) {
		if (hasActiveFood && hasActiveRoutine) {
			const repartitionResponse = await fetch(`/api/v1/repartition?catId=${activeCatId}&date=${date}`);
			const body = await repartitionResponse.json();
			if (repartitionResponse.ok) {
				repartition = body;
			} else {
				repartitionError = body.error ?? 'Impossible de calculer le repas du jour.';
			}
		}
	} else {
		const dailyLogResponse = await fetch(`/api/v1/daily-log?catId=${activeCatId}&date=${date}`);
		const body = await dailyLogResponse.json();
		if (dailyLogResponse.ok) {
			dailyLog = body;
		} else {
			dailyLogError = body.error ?? 'Impossible de charger ce jour.';
		}
	}

	return {
		cats,
		activeCat,
		activeCatId,
		date,
		today,
		isToday,
		foods,
		dailyPlans,
		repartition,
		repartitionError,
		dailyLog,
		dailyLogError
	};
};
