import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	updateMealEntryForUser,
	deleteMealEntryForUser,
	type UpdateMealEntryForUserInput
} from '$lib/server/services/mealEntry.service';

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();
	const input: UpdateMealEntryForUserInput = {};
	if (body.quantityG !== undefined) input.quantityG = Number(body.quantityG);
	if (body.validated !== undefined) input.validated = Boolean(body.validated);

	const result = await updateMealEntryForUser(params.id, input, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ mealEntry: result.mealEntry });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const result = await deleteMealEntryForUser(params.id, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ success: true });
};
