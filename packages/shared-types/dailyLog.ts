// Miroir de app/src/lib/server/services/dailyLog.service.ts — forme exacte de GET /api/daily-log
// (lecture seule d'un jour passé : n'affiche que ce qui a réellement été enregistré, ne génère ni ne
// persiste rien, contrairement à GET /api/repartition réservé au jour courant).

import type { RepartitionFoodType, DistributionMode, RationResume } from './repartition';

export interface DailyLogEntry {
	id: string;
	/** ISO datetime. */
	consumedAt: string;
	foodType: RepartitionFoodType;
	food: { id: string; name: string; brand: string; packageSizeG: number | null };
	quantiteG: number;
	validated: boolean;
	validatedBy: { id: string; name: string } | null;
	validatedAt: string | null;
	distributionMode: DistributionMode;
	/** Nombre de paquets de pâtée représenté par `quantiteG` — null hors pâtée. */
	paquets: number | null;
}

export interface DailyLogOkResponse {
	success: true;
	date: string;
	rer: number;
	der: number;
	entries: DailyLogEntry[];
	/** `score` est toujours absent ici (uniquement calculé pour le jour courant). */
	ration: RationResume;
}

export interface DailyLogErrorResponse {
	success?: false;
	error: string;
}
