import { json, error, type RequestHandler } from '@sveltejs/kit';
import { obtenirJournalJourPourUtilisateur } from '$lib/server/services/dailyLog.service';

/** Lecture seule d'une journée (passée ou en cours) : contrairement à GET /api/v1/repartition, ne génère
 * ni ne persiste rien — sert à consulter l'historique des jours précédents. */
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const catId = url.searchParams.get('catId');
	const date = url.searchParams.get('date');

	if (!catId || !date) {
		error(400, 'Paramètres catId et date requis.');
	}

	const result = await obtenirJournalJourPourUtilisateur(catId, date, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json(result);
};
