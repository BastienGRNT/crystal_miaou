import { json, error, type RequestHandler } from '@sveltejs/kit';
import { createFoodForOwner, listFoodsForOwner } from '$lib/server/services/food.service';
import {
	FOOD_LEGAL_STATUS_VALUES,
	FOOD_TYPE_VALUES,
	type FoodInput,
	type FoodType
} from '$lib/domain/food.calc';

function parseNullableNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	return Number(value);
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const typeParam = url.searchParams.get('type');
	const type = FOOD_TYPE_VALUES.includes(typeParam as FoodType) ? (typeParam as FoodType) : undefined;

	const foods = await listFoodsForOwner(locals.user.id, type);
	return json({ foods });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();

	const input: FoodInput = {
		name: typeof body.name === 'string' ? body.name : '',
		brand: typeof body.brand === 'string' ? body.brand : '',
		type: FOOD_TYPE_VALUES.includes(body.type) ? body.type : 'croquette',
		emKcal100g: parseNullableNumber(body.emKcal100g),
		packageSizeG: parseNullableNumber(body.packageSizeG),
		proteinesG100g: Number(body.proteinesG100g),
		lipidesG100g: Number(body.lipidesG100g),
		humiditeG100g: parseNullableNumber(body.humiditeG100g),
		fibresG100g: Number(body.fibresG100g),
		cendresG100g: Number(body.cendresG100g),
		glucidesG100g: parseNullableNumber(body.glucidesG100g),
		calciumG100g: parseNullableNumber(body.calciumG100g),
		phosphoreG100g: parseNullableNumber(body.phosphoreG100g),
		taurineG100g: parseNullableNumber(body.taurineG100g),
		statutLegal: FOOD_LEGAL_STATUS_VALUES.includes(body.statutLegal) ? body.statutLegal : 'complet'
	};

	const result = await createFoodForOwner(input, locals.user.id);

	if (!result.success) {
		return json({ errors: result.errors }, { status: 400 });
	}

	return json({ food: result.food }, { status: 201 });
};
