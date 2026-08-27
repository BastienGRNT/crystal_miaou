// Miroir de app/src/lib/domain/repartition.calc.ts + server/services/repartition.service.ts — forme
// exacte de GET/POST /api/repartition (menu du jour courant : calcule et persiste les quantités non
// verrouillées).

import type { StatusParNutriment, ScoreRation } from './nutrition';

export type RepartitionFoodType = 'croquette' | 'patee' | 'friandise';
export type DistributionMode = 'gamelle' | 'distributeur_automatique' | 'gamelle_ludique';

export interface GlucidesParAliment {
	foodId: string;
	foodName: string;
	pctMatiereSeche: number;
}

export interface FiabiliteAliment {
	foodId: string;
	foodName: string;
	emEstimee: boolean;
	humiditeEstimee: boolean;
	glucidesEstimes: boolean;
}

export interface RationResume {
	totalKcal: number;
	statuts: StatusParNutriment[];
	sousLeRER: boolean;
	glucidesParAliment: GlucidesParAliment[];
	fiabiliteParAliment: FiabiliteAliment[];
	/** Absent de la réponse de GET /api/daily-log (jours passés) — présent uniquement sur
	 * GET/POST /api/repartition (jour courant). */
	score?: ScoreRation;
}

export interface RepasRepartition {
	id: string;
	/** ISO datetime. */
	consumedAt: string;
	foodType: RepartitionFoodType;
	food: { id: string; name: string; brand: string; packageSizeG: number | null; doseDistributeurG: number | null };
	quantiteG: number;
	/** Kcal apportées par ce créneau — déjà calculé côté API, jamais à ré-dériver côté client. */
	kcal: number;
	locked: boolean;
	validated: boolean;
	validatedBy: { id: string; name: string } | null;
	validatedAt: string | null;
	distributionMode: DistributionMode;
	/** Nombre de doses du distributeur automatique représenté par `quantiteG` — null si ce créneau n'est
	 * pas distribué par un distributeur automatique à dose connue. */
	doses: number | null;
	/** Nombre de paquets de pâtée représenté par `quantiteG` — null hors pâtée. */
	paquets: number | null;
}

/** Récap des grammes de croquette du jour par "qui s'en charge" (distributeur déjà chargé vs à peser à
 * la main) — null si aucune croquette active aujourd'hui. */
export interface RecapDistributionCroquette {
	distributeurAutomatiqueG: number;
	aPreparerG: number;
}

export interface RepartitionOkResponse {
	success: true;
	rer: number;
	der: number;
	facteurDER: number;
	nombrePaquetsPatee: number | null;
	/** Non-null si l'utilisateur a fixé un nombre de paquets explicite (sinon calculé auto depuis le DER). */
	pateeNombrePaquetsOverride: number | null;
	repas: RepasRepartition[];
	recapCroquette: RecapDistributionCroquette | null;
	/** Total de grammes du jour par type d'aliment — déjà agrégé côté API (CLAUDE.md règle 9). */
	totauxParType: Record<RepartitionFoodType, number>;
	ration: RationResume;
	avertissements: string[];
}

export interface RepartitionErrorResponse {
	success?: false;
	error: string;
}
