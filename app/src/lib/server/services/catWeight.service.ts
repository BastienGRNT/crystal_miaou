import { isCatMemberForUser, findCatById } from '$lib/server/repositories/cat.repository';
import {
	createWeightLog,
	deleteWeightLog,
	listWeightLogsForCat
} from '$lib/server/repositories/catWeightLog.repository';
import { evaluerTendancePoids, type EvaluationTendancePoids } from '$lib/domain/catWeight.calc';
import type { DERGoal } from '$lib/domain/nutrition.calc';

export interface WeightLogEntry {
	id: string;
	weightKg: number;
	recordedAt: string;
}

export interface WeightHistoryResultatOk {
	success: true;
	historique: WeightLogEntry[];
	evaluation: EvaluationTendancePoids;
}

export interface WeightHistoryResultatErreur {
	success: false;
	error: string;
}

function objectifDepuisCondition(specialCondition: string): DERGoal | null {
	if (specialCondition === 'surpoids') return 'perte';
	return 'maintien';
}

export async function getWeightHistoryForUser(
	catId: string,
	userId: string
): Promise<WeightHistoryResultatOk | WeightHistoryResultatErreur> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, error: 'Chat introuvable.' };
	}

	const cat = await findCatById(catId);
	if (!cat) {
		return { success: false, error: 'Chat introuvable.' };
	}

	const logs = await listWeightLogsForCat(catId);
	const historique: WeightLogEntry[] = logs.map((log) => ({
		id: log.id,
		weightKg: Number(log.weightKg),
		recordedAt: log.recordedAt
	}));

	const evaluation = evaluerTendancePoids(historique, objectifDepuisCondition(cat.specialCondition));

	return { success: true, historique, evaluation };
}

export interface AddWeightLogResult {
	success: boolean;
	error?: string;
}

export async function addWeightLogForUser(
	catId: string,
	weightKg: number,
	recordedAt: string,
	userId: string
): Promise<AddWeightLogResult> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, error: 'Chat introuvable.' };
	}

	if (!Number.isFinite(weightKg) || weightKg <= 0) {
		return { success: false, error: 'Le poids doit être un nombre supérieur à 0.' };
	}

	if (!recordedAt || Number.isNaN(new Date(recordedAt).getTime())) {
		return { success: false, error: 'Date invalide.' };
	}

	await createWeightLog({ catId, weightKg, recordedAt, recordedByUserId: userId });
	return { success: true };
}

export async function deleteWeightLogForUser(
	catId: string,
	logId: string,
	userId: string
): Promise<boolean> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) return false;

	return deleteWeightLog(logId, catId);
}
