import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	createMealEntryForUser,
	listMealEntriesForUser
} from '$lib/server/services/mealEntry.service';
import type { MealEntryInput } from '$lib/domain/mealEntry.calc';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const catId = url.searchParams.get('catId');
	const date = url.searchParams.get('date');

	if (!catId || !date) {
		error(400, 'Paramètres catId et date requis.');
	}

	const mealEntries = await listMealEntriesForUser(catId, date, locals.user.id);

	if (mealEntries === null) {
		error(404, 'Chat introuvable.');
	}

	return json({ mealEntries });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();

	const input: MealEntryInput = {
		catId: typeof body.catId === 'string' ? body.catId : '',
		foodId: typeof body.foodId === 'string' ? body.foodId : '',
		quantityG:
			body.quantityG === null || body.quantityG === undefined || body.quantityG === ''
				? null
				: Number(body.quantityG),
		consumedAt: typeof body.consumedAt === 'string' ? body.consumedAt : ''
	};

	const result = await createMealEntryForUser(input, locals.user.id);

	if (!result.success) {
		return json({ errors: result.errors }, { status: 400 });
	}

	return json({ mealEntry: result.mealEntry }, { status: 201 });
};
