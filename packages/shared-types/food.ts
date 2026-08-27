// Miroir de app/src/lib/domain/food.calc.ts + app/src/lib/server/services/food.service.ts.

export type FoodType = 'croquette' | 'patee' | 'friandise';
export type FoodLegalStatus = 'complet' | 'complementaire';

/** Forme renvoyée par GET/POST/PATCH /api/v1/foods (withEmSuspecte + withNumericFields). */
export interface Food {
	id: string;
	name: string;
	brand: string;
	type: FoodType;
	emKcal100g: number | null;
	emEstimee: boolean;
	/** Vrai si `emEstimee` est faux mais que la valeur déclarée correspond en fait à une suggestion de
	 * l'app recopiée telle quelle — signalé séparément de `emEstimee`, absent des réponses POST/PATCH
	 * brutes (uniquement calculé par `listFoodsForOwner`/`getFoodForOwner`). */
	emSuspecte?: boolean;
	packageSizeG: number | null;
	doseDistributeurG: number | null;
	proteinesG100g: number;
	lipidesG100g: number;
	humiditeG100g: number | null;
	humiditeEstimee: boolean;
	fibresG100g: number;
	cendresG100g: number;
	glucidesG100g: number | null;
	glucidesEstimes: boolean;
	calciumG100g: number | null;
	phosphoreG100g: number | null;
	taurineG100g: number | null;
	statutLegal: FoodLegalStatus;
	createdByUserId: string;
}

export interface FoodInput {
	name: string;
	brand: string;
	type: FoodType;
	emKcal100g: number | null;
	packageSizeG: number | null;
	doseDistributeurG: number | null;
	proteinesG100g: number;
	lipidesG100g: number;
	humiditeG100g: number | null;
	fibresG100g: number;
	cendresG100g: number;
	glucidesG100g: number | null;
	calciumG100g: number | null;
	phosphoreG100g: number | null;
	taurineG100g: number | null;
	statutLegal: FoodLegalStatus;
}
