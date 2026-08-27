// Miroir de app/src/lib/domain/mealEntry.calc.ts + repositories/mealEntry.repository.ts.
//
// Utilisé par l'écran "Ajouter un repas" (ajout manuel hors routine) — GET /api/meal-entries renvoie
// les lignes brutes de la table `meal_entry` (colonnes `numeric` sérialisées en string par Postgres/
// Drizzle, dates en ISO string via JSON), avec `food` imbriqué au même format brut. Le menu du jour
// géré par la routine (écran Accueil) passe par GET /api/repartition et GET /api/daily-log, qui
// renvoient des formes déjà normalisées (voir repartition.ts, dailyLog.ts) — ne pas confondre les deux.

import type { FoodType, FoodLegalStatus } from './food';
import type { DailyPlanSlotDistributionMode, DailyPlanSlotFoodType } from './dailyPlan';

/** `food` tel que renvoyé imbriqué par Drizzle sur ces endpoints précis : colonnes `numeric` encore en
 * string (pas passées par `withNumericFields`, à la différence de GET /api/foods). */
export interface MealEntryRawFood {
	id: string;
	name: string;
	brand: string;
	type: FoodType;
	emKcal100g: string | null;
	emEstimee: boolean;
	packageSizeG: string | null;
	doseDistributeurG: string | null;
	proteinesG100g: string;
	lipidesG100g: string;
	humiditeG100g: string | null;
	humiditeEstimee: boolean;
	fibresG100g: string;
	cendresG100g: string;
	glucidesG100g: string | null;
	glucidesEstimes: boolean;
	calciumG100g: string | null;
	phosphoreG100g: string | null;
	taurineG100g: string | null;
	statutLegal: FoodLegalStatus;
}

export interface MealEntryRawSourceSlot {
	id: string;
	dailyPlanId: string;
	timeOfDay: string;
	foodType: DailyPlanSlotFoodType;
	distributionMode: DailyPlanSlotDistributionMode;
	position: number;
}

/** Forme renvoyée par GET /api/meal-entries. */
export interface MealEntry {
	id: string;
	catId: string;
	foodId: string;
	quantityG: string | null;
	locked: boolean;
	validated: boolean;
	validatedByUserId: string | null;
	validatedAt: string | null;
	consumedAt: string;
	recordedByUserId: string;
	sourceDailyPlanSlotId: string | null;
	food: MealEntryRawFood;
	sourceDailyPlanSlot: MealEntryRawSourceSlot | null;
}

export interface MealEntryInput {
	catId: string;
	foodId: string;
	quantityG: number | null;
	/** ISO datetime. */
	consumedAt: string;
}
