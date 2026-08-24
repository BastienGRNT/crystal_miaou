import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	addWeightLogForUser,
	deleteWeightLogForUser,
	getWeightHistoryForUser
} from '$lib/server/services/catWeight.service';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const result = await getWeightHistoryForUser(params.id, locals.user.id);

	if (!result.success) {
		error(404, result.error);
	}

	return json({ historique: result.historique, evaluation: result.evaluation });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();
	const weightKg = Number(body.weightKg);
	const recordedAt = typeof body.recordedAt === 'string' ? body.recordedAt : '';

	const result = await addWeightLogForUser(params.id, weightKg, recordedAt, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ success: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();
	const logId = typeof body.id === 'string' ? body.id : '';

	const deleted = await deleteWeightLogForUser(params.id, logId, locals.user.id);

	if (!deleted) {
		error(404, 'Pesée introuvable.');
	}

	return json({ success: true });
};
