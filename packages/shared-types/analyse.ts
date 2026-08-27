// Miroir de app/src/lib/domain/analyse.calc.ts + server/services/analyse.service.ts — forme exacte
// de GET /api/v1/analyse.

import type { RepartitionFoodType } from './repartition';

export type StatutJourAnalyse = 'OK' | 'DEFICIT' | 'EXCES' | 'SANS_DONNEE';

export interface JourAnalyse {
	date: string;
	totalKcal: number;
	der: number;
	pctDER: number;
	grammesParType: Record<RepartitionFoodType, number>;
	statut: StatutJourAnalyse;
}

export interface AnalyseOkResponse {
	success: true;
	rer: number;
	der: number;
	jours: JourAnalyse[];
	/** Null si aucun jour de la période n'a de donnée. */
	moyennePctDER: number | null;
	tauxConformitePct: number | null;
	moyenneGrammesParType: Record<RepartitionFoodType, number>;
}

export interface AnalyseErrorResponse {
	success?: false;
	error: string;
}
