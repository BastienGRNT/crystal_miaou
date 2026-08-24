// Agrégats purs pour la page d'analyse (évolution des apports sur plusieurs jours).

import type { RepartitionFoodType } from '$lib/domain/repartition.calc';

export type StatutJourAnalyse = 'OK' | 'DEFICIT' | 'EXCES' | 'SANS_DONNEE';

export interface JourAnalyse {
	date: string;
	totalKcal: number;
	der: number;
	pctDER: number;
	grammesParType: Record<RepartitionFoodType, number>;
	statut: StatutJourAnalyse;
}

/** Statut global du jour : DEFICIT/EXCES si l'apport calorique s'écarte trop du DER (±10%, tolérance
 * réaliste vu l'arrondi au demi-paquet/gramme), OK sinon, SANS_DONNEE si aucun repas enregistré. */
export function determinerStatutJour(totalKcal: number, der: number, aDesRepas: boolean): StatutJourAnalyse {
	if (!aDesRepas || der <= 0) return 'SANS_DONNEE';
	const ecartPct = ((totalKcal - der) / der) * 100;
	if (ecartPct < -10) return 'DEFICIT';
	if (ecartPct > 10) return 'EXCES';
	return 'OK';
}

/** Moyenne du % de DER atteint sur les jours où au moins un repas a été enregistré (les jours sans
 * donnée ne comptent ni pour ni contre la moyenne). */
export function calculerMoyennePctDER(jours: JourAnalyse[]): number | null {
	const joursAvecDonnee = jours.filter((j) => j.statut !== 'SANS_DONNEE');
	if (joursAvecDonnee.length === 0) return null;
	const somme = joursAvecDonnee.reduce((acc, j) => acc + j.pctDER, 0);
	return Math.round(somme / joursAvecDonnee.length);
}

/** Part des jours avec données dont l'apport calorique est resté dans la fourchette normale (OK). */
export function calculerTauxConformite(jours: JourAnalyse[]): number | null {
	const joursAvecDonnee = jours.filter((j) => j.statut !== 'SANS_DONNEE');
	if (joursAvecDonnee.length === 0) return null;
	const conformes = joursAvecDonnee.filter((j) => j.statut === 'OK').length;
	return Math.round((conformes / joursAvecDonnee.length) * 100);
}

/** Moyenne quotidienne (g) donnée par type d'aliment, sur l'ensemble de la période (jours sans donnée
 * comptent pour 0g, pas exclus — reflète la réalité du foyer sur la période demandée). */
export function calculerMoyenneGrammesParType(jours: JourAnalyse[]): Record<RepartitionFoodType, number> {
	const totaux: Record<RepartitionFoodType, number> = { croquette: 0, patee: 0, friandise: 0 };
	if (jours.length === 0) return totaux;

	for (const jour of jours) {
		totaux.croquette += jour.grammesParType.croquette;
		totaux.patee += jour.grammesParType.patee;
		totaux.friandise += jour.grammesParType.friandise;
	}

	return {
		croquette: totaux.croquette / jours.length,
		patee: totaux.patee / jours.length,
		friandise: totaux.friandise / jours.length
	};
}
