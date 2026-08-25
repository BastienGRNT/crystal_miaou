import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	createDailyPlanForUser,
	listDailyPlansForCatUser
} from '$lib/server/services/dailyPlan.service';
import type {
	DailyPlanInput,
	DailyPlanSlotDistributionMode,
	DailyPlanSlotFoodType
} from '$lib/domain/dailyPlan.calc';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const catId = url.searchParams.get('catId');
	if (!catId) {
		error(400, 'Paramètre catId requis.');
	}

	const dailyPlans = await listDailyPlansForCatUser(catId, locals.user.id);
	if (dailyPlans === null) {
		error(404, 'Chat introuvable.');
	}

	return json({ dailyPlans });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();

	const input: DailyPlanInput = {
		catId: typeof body.catId === 'string' ? body.catId : '',
		name: typeof body.name === 'string' ? body.name : '',
		slots: Array.isArray(body.slots)
			? body.slots.map((slot: unknown) => {
					const s = slot as Record<string, unknown>;
					return {
						timeOfDay: typeof s.timeOfDay === 'string' ? s.timeOfDay : '',
						foodType: s.foodType as DailyPlanSlotFoodType,
						distributionMode: s.distributionMode as DailyPlanSlotDistributionMode
					};
				})
			: []
	};

	const result = await createDailyPlanForUser(input, locals.user.id);

	if (!result.success) {
		return json({ errors: result.errors }, { status: 400 });
	}

	return json({ dailyPlan: result.dailyPlan }, { status: 201 });
};
