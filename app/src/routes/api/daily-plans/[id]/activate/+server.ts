import { json, error, type RequestHandler } from '@sveltejs/kit';
import { activateDailyPlanForUser } from '$lib/server/services/dailyPlan.service';

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const result = await activateDailyPlanForUser(params.id, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ success: true });
};
