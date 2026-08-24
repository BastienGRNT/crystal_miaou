import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	deleteDailyPlanForUser,
	getDailyPlanForUser,
	updateDailyPlanForUser
} from '$lib/server/services/dailyPlan.service';
import type { DailyPlanInput, DailyPlanSlotFoodType } from '$lib/domain/dailyPlan.calc';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const dailyPlan = await getDailyPlanForUser(params.id, locals.user.id);
	if (!dailyPlan) {
		error(404, 'Routine introuvable.');
	}

	return json({ dailyPlan });
};

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
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
						foodType: s.foodType as DailyPlanSlotFoodType
					};
				})
			: []
	};

	const result = await updateDailyPlanForUser(params.id, input, locals.user.id);

	if (!result.success) {
		return json({ errors: result.errors }, { status: 400 });
	}

	return json({ dailyPlan: result.dailyPlan });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const result = await deleteDailyPlanForUser(params.id, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ success: true });
};
