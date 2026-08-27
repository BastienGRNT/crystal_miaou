import { json, error, type RequestHandler } from '@sveltejs/kit';
import { createCatForUser, listCatsForOwner } from '$lib/server/services/cat.service';
import {
	CAT_ACTIVITY_LEVEL_VALUES,
	CAT_DER_AJUSTEMENT_PCT_VALEURS,
	CAT_SEX_VALUES,
	CAT_SPECIAL_CONDITION_VALUES,
	type CatOnboardingInput
} from '$lib/domain/cat.calc';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const cats = await listCatsForOwner(locals.user.id);
	// Valeurs fermées d'ajustement DER (specs/nutrition-spec.md section 5) renvoyées ici plutôt que
	// dupliquées côté client : le web les importe directement depuis le domain (même runtime JS), mais
	// le mobile React Native ne peut pas — c'est donc l'API qui les lui fournit, jamais une constante
	// en dur côté client (CLAUDE.md règle 9).
	return json({ cats, derAjustementPctValeurs: CAT_DER_AJUSTEMENT_PCT_VALEURS });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();

	const input: CatOnboardingInput = {
		name: typeof body.name === 'string' ? body.name : '',
		weightKg: Number(body.weightKg),
		birthDate: typeof body.birthDate === 'string' && body.birthDate ? body.birthDate : null,
		ageYears:
			body.ageYears === null || body.ageYears === undefined || body.ageYears === ''
				? null
				: Number(body.ageYears),
		sex: CAT_SEX_VALUES.includes(body.sex) ? body.sex : 'male',
		sterilized: Boolean(body.sterilized),
		activityLevel: CAT_ACTIVITY_LEVEL_VALUES.includes(body.activityLevel)
			? body.activityLevel
			: 'modere',
		hasOutdoorAccess: Boolean(body.hasOutdoorAccess),
		specialCondition: CAT_SPECIAL_CONDITION_VALUES.includes(body.specialCondition)
			? body.specialCondition
			: 'aucune'
	};

	const result = await createCatForUser(input, locals.user.id);

	if (!result.success) {
		return json({ errors: result.errors }, { status: 400 });
	}

	return json({ cat: result.cat }, { status: 201 });
};
