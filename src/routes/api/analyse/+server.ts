import { json, error, type RequestHandler } from '@sveltejs/kit';
import { obtenirAnalysePourUtilisateur } from '$lib/server/services/analyse.service';

const DAYS_DEFAUT = 14;
const DAYS_MAX = 90;

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const catId = url.searchParams.get('catId');
	if (!catId) {
		error(400, 'Paramètre catId requis.');
	}

	const daysParam = url.searchParams.get('days');
	const days = daysParam ? Math.min(Math.max(1, Number(daysParam) || DAYS_DEFAUT), DAYS_MAX) : DAYS_DEFAUT;

	const result = await obtenirAnalysePourUtilisateur(catId, locals.user.id, days);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json(result);
};
