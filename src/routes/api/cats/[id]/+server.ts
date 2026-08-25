import { json, error, type RequestHandler } from '@sveltejs/kit';
import { updateCatFoodSelectionForUser, updateCatProfileForUser } from '$lib/server/services/cat.service';
import {
	CAT_ACTIVITY_LEVEL_VALUES,
	CAT_DER_AJUSTEMENT_PCT_VALEURS,
	CAT_SEX_VALUES,
	CAT_SPECIAL_CONDITION_VALUES,
	type CatFoodSelectionInput,
	type CatProfileInput
} from '$lib/domain/cat.calc';

const PROFILE_FIELDS = [
	'name',
	'weightKg',
	'birthDate',
	'sex',
	'sterilized',
	'activityLevel',
	'hasOutdoorAccess',
	'specialCondition',
	'derAjustementPct'
];

export const PATCH: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();

	if (PROFILE_FIELDS.some((field) => field in body)) {
		const input: CatProfileInput = {
			name: typeof body.name === 'string' ? body.name : '',
			weightKg: Number(body.weightKg),
			birthDate: typeof body.birthDate === 'string' ? body.birthDate : '',
			sex: CAT_SEX_VALUES.includes(body.sex) ? body.sex : 'male',
			sterilized: Boolean(body.sterilized),
			activityLevel: CAT_ACTIVITY_LEVEL_VALUES.includes(body.activityLevel)
				? body.activityLevel
				: 'modere',
			hasOutdoorAccess: Boolean(body.hasOutdoorAccess),
			specialCondition: CAT_SPECIAL_CONDITION_VALUES.includes(body.specialCondition)
				? body.specialCondition
				: 'aucune',
			derAjustementPct: CAT_DER_AJUSTEMENT_PCT_VALEURS.includes(Number(body.derAjustementPct))
				? Number(body.derAjustementPct)
				: 0
		};

		const result = await updateCatProfileForUser(params.id, input, locals.user.id);

		if (!result.success) {
			return json({ errors: result.errors }, { status: 400 });
		}

		return json({ cat: result.cat });
	}

	const input: Partial<CatFoodSelectionInput> = {};
	if ('croquetteFoodId' in body) {
		input.croquetteFoodId = typeof body.croquetteFoodId === 'string' ? body.croquetteFoodId : null;
	}
	if ('pateeFoodId' in body) {
		input.pateeFoodId = typeof body.pateeFoodId === 'string' ? body.pateeFoodId : null;
	}
	if ('friandiseFoodId' in body) {
		input.friandiseFoodId = typeof body.friandiseFoodId === 'string' ? body.friandiseFoodId : null;
	}
	if ('friandiseQuantiteTotaleG' in body) {
		input.friandiseQuantiteTotaleG =
			body.friandiseQuantiteTotaleG === null || body.friandiseQuantiteTotaleG === undefined
				? null
				: Number(body.friandiseQuantiteTotaleG);
	}
	if ('pateeNombrePaquetsOverride' in body) {
		input.pateeNombrePaquetsOverride =
			body.pateeNombrePaquetsOverride === null || body.pateeNombrePaquetsOverride === undefined
				? null
				: Number(body.pateeNombrePaquetsOverride);
	}

	const result = await updateCatFoodSelectionForUser(params.id, input, locals.user.id);

	if (!result.success) {
		return json({ errors: result.errors }, { status: 400 });
	}

	return json({ cat: result.cat });
};
