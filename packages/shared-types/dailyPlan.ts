// Miroir de app/src/lib/domain/dailyPlan.calc.ts + repositories/dailyPlan.repository.ts.

export type DailyPlanSlotFoodType = 'croquette' | 'patee' | 'friandise';
export type DailyPlanSlotDistributionMode = 'gamelle' | 'distributeur_automatique' | 'gamelle_ludique';

export interface DailyPlanSlot {
	id: string;
	dailyPlanId: string;
	/** Format 'HH:MM'. */
	timeOfDay: string;
	foodType: DailyPlanSlotFoodType;
	distributionMode: DailyPlanSlotDistributionMode;
	position: number;
}

/** Forme renvoyée par GET/POST/PATCH /api/daily-plans (routine + créneaux, sans quantité — calculée
 * chaque jour par GET /api/repartition, jamais stockée ici). */
export interface DailyPlan {
	id: string;
	catId: string;
	name: string;
	isActive: boolean;
	slots: DailyPlanSlot[];
}

export interface DailyPlanSlotInput {
	timeOfDay: string;
	foodType: DailyPlanSlotFoodType;
	distributionMode: DailyPlanSlotDistributionMode;
}

export interface DailyPlanInput {
	catId: string;
	name: string;
	slots: DailyPlanSlotInput[];
}
