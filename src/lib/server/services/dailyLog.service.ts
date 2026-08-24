import { findCatById, isCatMemberForUser } from '$lib/server/repositories/cat.repository';
import { listMealEntriesForCatOnDate } from '$lib/server/repositories/mealEntry.repository';
import { agregerRation, calculerDER, calculerRER, resoudreFacteurDER, validerRation } from '$lib/domain/nutrition.calc';
import { deriveDERFactorProfileFromCat } from '$lib/domain/cat.calc';
import type { RepartitionFoodType } from '$lib/domain/repartition.calc';
import {
	calculerFiabiliteParAliment,
	calculerGlucidesParAliment,
	type RationResume
} from '$lib/server/services/repartition.service';

export interface DailyLogEntry {
	id: string;
	consumedAt: string;
	foodType: RepartitionFoodType;
	food: { id: string; name: string; brand: string; packageSizeG: number | null };
	quantiteG: number;
	validated: boolean;
	validatedBy: { id: string; name: string } | null;
	validatedAt: string | null;
}

export interface DailyLogResultatOk {
	success: true;
	date: string;
	rer: number;
	der: number;
	entries: DailyLogEntry[];
	ration: RationResume;
}

export interface DailyLogResultatErreur {
	success: false;
	error: string;
}

/** Lecture seule d'une journée passée : n'affiche que ce qui a réellement été enregistré ce jour-là,
 * sans jamais générer d'entrées manquantes ni recalculer/persister de quantités (à la différence de
 * `calculerEtPersisterRepartitionJournaliere`, réservé au jour courant). */
export async function obtenirJournalJourPourUtilisateur(
	catId: string,
	date: string,
	userId: string
): Promise<DailyLogResultatOk | DailyLogResultatErreur> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, error: 'Chat introuvable.' };
	}

	const cat = await findCatById(catId);
	if (!cat) {
		return { success: false, error: 'Chat introuvable.' };
	}

	const mealEntries = await listMealEntriesForCatOnDate(catId, new Date(date));

	const rer = calculerRER(Number(cat.weightKg));
	const facteurDER = resoudreFacteurDER(deriveDERFactorProfileFromCat(cat, new Date(date)));
	const der = calculerDER(rer, facteurDER);

	const rationCalculee = agregerRation(
		mealEntries.map((entry) => ({
			quantiteG: Number(entry.quantityG ?? 0),
			emKcal100g: Number(entry.food.emKcal100g),
			proteinesG100g: Number(entry.food.proteinesG100g),
			lipidesG100g: Number(entry.food.lipidesG100g),
			calciumG100g: entry.food.calciumG100g === null ? null : Number(entry.food.calciumG100g),
			phosphoreG100g: entry.food.phosphoreG100g === null ? null : Number(entry.food.phosphoreG100g),
			taurineG100g: entry.food.taurineG100g === null ? null : Number(entry.food.taurineG100g),
			glucidesG100g: entry.food.glucidesG100g === null ? null : Number(entry.food.glucidesG100g),
			estAlimentHumide: entry.food.type === 'patee',
			humiditeG100g: Number(entry.food.humiditeG100g)
		}))
	);

	const statuts = validerRation(rationCalculee);

	const entries: DailyLogEntry[] = mealEntries.map((entry) => ({
		id: entry.id,
		consumedAt: entry.consumedAt.toISOString(),
		foodType: entry.food.type as RepartitionFoodType,
		food: {
			id: entry.food.id,
			name: entry.food.name,
			brand: entry.food.brand,
			packageSizeG: entry.food.packageSizeG === null ? null : Number(entry.food.packageSizeG)
		},
		quantiteG: Number(entry.quantityG ?? 0),
		validated: entry.validated,
		validatedBy: entry.validatedBy ? { id: entry.validatedBy.id, name: entry.validatedBy.name } : null,
		validatedAt: entry.validatedAt ? entry.validatedAt.toISOString() : null
	}));

	return {
		success: true,
		date,
		rer,
		der,
		entries,
		ration: {
			totalKcal: rationCalculee.totalKcal,
			statuts,
			sousLeRER: mealEntries.length > 0 && rationCalculee.totalKcal < rer,
			glucidesParAliment: calculerGlucidesParAliment(mealEntries),
			fiabiliteParAliment: calculerFiabiliteParAliment(mealEntries)
		}
	};
}
