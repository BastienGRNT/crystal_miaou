// Miroir de app/src/lib/domain/cat.calc.ts + app/src/lib/server/services/cat.service.ts (listCatsForOwner).

export type CatSex = 'male' | 'femelle';
export type CatActivityLevel = 'faible' | 'modere' | 'eleve';
export type CatSpecialCondition = 'aucune' | 'gestation' | 'croissance' | 'surpoids';

/** Forme renvoyée par GET /api/v1/cats (et POST/PATCH /api/v1/cats/:id, sans `ageMonths`). */
export interface Cat {
	id: string;
	name: string;
	weightKg: number;
	birthDate: string | null;
	/** Calculé par l'API (CLAUDE.md règle 9) — jamais recalculé côté client. Présent sur GET /api/v1/cats
	 * uniquement (absent des réponses brutes de POST/PATCH). */
	ageMonths?: number | null;
	sex: CatSex;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
	activeCroquetteFoodId: string | null;
	activePateeFoodId: string | null;
	activeFriandiseFoodId: string | null;
	friandiseQuantiteTotaleG: number | null;
	pateeNombrePaquetsOverride: number | null;
	derAjustementPct: number;
	createdByUserId: string;
}

export interface CatOnboardingInput {
	name: string;
	weightKg: number;
	birthDate: string | null;
	ageYears: number | null;
	sex: CatSex;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
}

export interface CatProfileInput {
	name: string;
	weightKg: number;
	birthDate: string;
	sex: CatSex;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
}

export interface CatFoodSelectionInput {
	croquetteFoodId: string | null;
	pateeFoodId: string | null;
	friandiseFoodId: string | null;
	friandiseQuantiteTotaleG: number | null;
	pateeNombrePaquetsOverride: number | null;
}

/** Valeurs fermées d'ajustement DER (specs/nutrition-spec.md section 5) — renvoyées par
 * GET /api/v1/cats en tant que `derAjustementPctValeurs`, jamais recopiées en dur côté client. */
export type CatDerAjustementPct = -10 | -5 | 0 | 5 | 10;

export interface CatMember {
	membershipId: string;
	userId: string;
	name: string;
	email: string;
}
