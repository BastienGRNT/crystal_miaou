import {
	createFood,
	deleteFood,
	findFoodByIdForUser,
	listFoodsForUser,
	updateFood
} from '$lib/server/repositories/food.repository';
import {
	detecterEmSuspecte,
	resolveFoodEnergyValues,
	resolveFoodHumidity,
	validateFoodInput,
	type FoodInput,
	type FoodType
} from '$lib/domain/food.calc';
import type { food } from '$lib/server/db/schema';

/** Ajoute `emSuspecte` : vrai si emEstimee=false mais que la valeur déclarée est en fait la suggestion
 * de l'app recopiée telle quelle (voir `detecterEmSuspecte`) — signalé séparément de `emEstimee` pour
 * ne pas prétendre que le champ était vide alors que l'utilisateur y a bien saisi quelque chose. */
function withEmSuspecte<T extends typeof food.$inferSelect>(row: T): T & { emSuspecte: boolean } {
	return {
		...row,
		emSuspecte: detecterEmSuspecte({
			emKcal100g: Number(row.emKcal100g),
			emEstimee: row.emEstimee,
			proteinesG100g: Number(row.proteinesG100g),
			lipidesG100g: Number(row.lipidesG100g),
			humiditeG100g: Number(row.humiditeG100g),
			fibresG100g: Number(row.fibresG100g),
			cendresG100g: Number(row.cendresG100g),
			glucidesG100g: Number(row.glucidesG100g)
		})
	};
}

export interface FoodMutationResult {
	success: boolean;
	food?: typeof food.$inferSelect;
	errors?: Partial<Record<keyof FoodInput, string>>;
}

function toRecordInput(input: FoodInput) {
	const resolvedHumidite = resolveFoodHumidity(input.type, input.humiditeG100g);
	const resolved = resolveFoodEnergyValues({ ...input, humiditeG100g: resolvedHumidite.humiditeG100g });
	return {
		name: input.name.trim(),
		brand: input.brand.trim(),
		type: input.type,
		emKcal100g: resolved.emKcal100g,
		emEstimee: resolved.emEstimee,
		packageSizeG: input.packageSizeG,
		doseDistributeurG: input.doseDistributeurG,
		proteinesG100g: input.proteinesG100g,
		lipidesG100g: input.lipidesG100g,
		humiditeG100g: resolvedHumidite.humiditeG100g,
		humiditeEstimee: resolvedHumidite.humiditeEstimee,
		fibresG100g: input.fibresG100g,
		cendresG100g: input.cendresG100g,
		glucidesG100g: resolved.glucidesG100g,
		glucidesEstimes: resolved.glucidesEstimees,
		calciumG100g: input.calciumG100g,
		phosphoreG100g: input.phosphoreG100g,
		taurineG100g: input.taurineG100g,
		statutLegal: input.statutLegal
	};
}

export async function listFoodsForOwner(ownerUserId: string, type?: FoodType) {
	const foods = await listFoodsForUser(ownerUserId, type);
	return foods.map(withEmSuspecte);
}

export async function getFoodForOwner(id: string, ownerUserId: string) {
	const found = await findFoodByIdForUser(id, ownerUserId);
	return found ? withEmSuspecte(found) : found;
}

export async function createFoodForOwner(
	input: FoodInput,
	ownerUserId: string
): Promise<FoodMutationResult> {
	const { valid, errors } = validateFoodInput(input);

	if (!valid) {
		return { success: false, errors };
	}

	const createdFood = await createFood(toRecordInput(input), ownerUserId);
	return { success: true, food: createdFood };
}

export async function updateFoodForOwner(
	id: string,
	input: FoodInput,
	ownerUserId: string
): Promise<FoodMutationResult> {
	const { valid, errors } = validateFoodInput(input);

	if (!valid) {
		return { success: false, errors };
	}

	const updatedFood = await updateFood(id, ownerUserId, toRecordInput(input));

	if (!updatedFood) {
		return { success: false, errors: {} };
	}

	return { success: true, food: updatedFood };
}

export async function deleteFoodForOwner(id: string, ownerUserId: string): Promise<boolean> {
	return deleteFood(id, ownerUserId);
}
