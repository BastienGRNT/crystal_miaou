import { json, error, type RequestHandler } from '@sveltejs/kit';
import {
	calculerEtPersisterRepartitionJournaliere,
	reinitialiserRepartitionJournaliere
} from '$lib/server/services/repartition.service';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const catId = url.searchParams.get('catId');
	const date = url.searchParams.get('date');

	if (!catId || !date) {
		error(400, 'Paramètres catId et date requis.');
	}

	const result = await calculerEtPersisterRepartitionJournaliere(catId, date, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json(result);
};

/** Réinitialise la journée : supprime tous les repas déjà générés (même verrouillés/donnés) et les
 * régénère depuis zéro à partir de la routine active. */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();
	const catId = body.catId as string | undefined;
	const date = body.date as string | undefined;

	if (!catId || !date) {
		error(400, 'Paramètres catId et date requis.');
	}

	const result = await reinitialiserRepartitionJournaliere(catId, date, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json(result);
};
