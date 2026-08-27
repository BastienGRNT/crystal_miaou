// Miroir de app/src/lib/domain/catWeight.calc.ts + server/services/catWeight.service.ts — forme
// exacte de GET /api/v1/cats/:id/weight-logs.

export type TendancePoids = 'HAUSSE' | 'BAISSE' | 'STABLE';

export interface EvaluationTendancePoids {
	tendance: TendancePoids | null;
	pctVariation: number | null;
	joursCouverts: number | null;
	/** Texte prêt à afficher — jamais reconstruit côté client à partir de `tendance`/`pctVariation`. */
	suggestion: string | null;
}

export interface WeightLogEntry {
	id: string;
	weightKg: number;
	/** 'YYYY-MM-DD'. */
	recordedAt: string;
}

export interface WeightHistoryOkResponse {
	historique: WeightLogEntry[];
	evaluation: EvaluationTendancePoids;
}
