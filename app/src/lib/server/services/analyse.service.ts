import { findCatById, isCatMemberForUser } from '$lib/server/repositories/cat.repository';
import { listMealEntriesForCatInRange } from '$lib/server/repositories/mealEntry.repository';
import { calculerDER, calculerRER, resoudreFacteurDER } from '$lib/domain/nutrition.calc';
import { deriveDERFactorProfileFromCat } from '$lib/domain/cat.calc';
import {
	determinerStatutJour,
	calculerMoyennePctDER,
	calculerTauxConformite,
	calculerMoyenneGrammesParType,
	type JourAnalyse
} from '$lib/domain/analyse.calc';
import type { RepartitionFoodType } from '$lib/domain/repartition.calc';

export interface AnalyseResultatOk {
	success: true;
	rer: number;
	der: number;
	jours: JourAnalyse[];
	moyennePctDER: number | null;
	tauxConformitePct: number | null;
	moyenneGrammesParType: Record<RepartitionFoodType, number>;
}

export interface AnalyseResultatErreur {
	success: false;
	error: string;
}

/** Date locale (pas UTC) au format ISO — doit rester cohérente avec les bornes de jour calculées en
 * heure locale (`setHours(0, 0, 0, 0)`) dans le repository, sous peine de décaler un repas de minuit
 * sur le mauvais jour selon le fuseau du serveur. */
function isoDateOf(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Historique agrégé jour par jour sur `days` jours (dont aujourd'hui) pour un chat : apport calorique
 * réel vs DER, répartition par type d'aliment. Lecture seule, basée sur les repas déjà enregistrés
 * (pas de génération) — un jour sans repas enregistré est marqué "sans donnée", pas à 0 kcal silencieux. */
export async function obtenirAnalysePourUtilisateur(
	catId: string,
	userId: string,
	days: number
): Promise<AnalyseResultatOk | AnalyseResultatErreur> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, error: 'Chat introuvable.' };
	}

	const cat = await findCatById(catId);
	if (!cat) {
		return { success: false, error: 'Chat introuvable.' };
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const startDate = new Date(today);
	startDate.setDate(startDate.getDate() - (days - 1));

	const mealEntries = await listMealEntriesForCatInRange(catId, startDate, today);

	const rer = calculerRER(Number(cat.weightKg));
	const facteurDER = resoudreFacteurDER(deriveDERFactorProfileFromCat(cat, today));
	const der = calculerDER(rer, facteurDER, Number(cat.derAjustementPct));

	const entriesParJour = new Map<string, typeof mealEntries>();
	for (const entry of mealEntries) {
		const dateKey = isoDateOf(entry.consumedAt);
		const liste = entriesParJour.get(dateKey) ?? [];
		liste.push(entry);
		entriesParJour.set(dateKey, liste);
	}

	const jours: JourAnalyse[] = [];
	for (let i = 0; i < days; i++) {
		const jourDate = new Date(startDate);
		jourDate.setDate(jourDate.getDate() + i);
		const dateKey = isoDateOf(jourDate);

		const entriesDuJour = entriesParJour.get(dateKey) ?? [];
		const grammesParType: Record<RepartitionFoodType, number> = { croquette: 0, patee: 0, friandise: 0 };
		let totalKcal = 0;

		for (const entry of entriesDuJour) {
			const quantiteG = Number(entry.quantityG ?? 0);
			const foodType = entry.food.type as RepartitionFoodType;
			grammesParType[foodType] += quantiteG;
			totalKcal += (Number(entry.food.emKcal100g) / 100) * quantiteG;
		}

		const pctDER = der > 0 ? Math.round((totalKcal / der) * 100) : 0;

		jours.push({
			date: dateKey,
			totalKcal,
			der,
			pctDER,
			grammesParType,
			statut: determinerStatutJour(totalKcal, der, entriesDuJour.length > 0)
		});
	}

	return {
		success: true,
		rer,
		der,
		jours,
		moyennePctDER: calculerMoyennePctDER(jours),
		tauxConformitePct: calculerTauxConformite(jours),
		moyenneGrammesParType: calculerMoyenneGrammesParType(jours)
	};
}
