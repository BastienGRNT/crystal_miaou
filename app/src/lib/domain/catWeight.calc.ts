// Suivi de poids réel dans le temps — specs/nutrition-spec.md ne fixe pas de formule ici, mais rappelle
// (section 5-6 et pratique vétérinaire usuelle) que le DER calculé n'est qu'un point de départ : on
// nourrit selon ce calcul 2-3 semaines, on repèse, puis on ajuste de ±10% si la trajectoire ne suit pas
// l'objectif. Ce fichier ne modifie jamais le facteur DER automatiquement — il ne fait que suggérer.

import type { DERGoal } from './nutrition.calc';

export interface PeseeInput {
	recordedAt: string; // 'YYYY-MM-DD'
	weightKg: number;
}

export type TendancePoids = 'HAUSSE' | 'BAISSE' | 'STABLE';

export interface EvaluationTendancePoids {
	tendance: TendancePoids | null;
	pctVariation: number | null;
	joursCouverts: number | null;
	suggestion: string | null;
}

const DUREE_MIN_JOURS_POUR_SUGGESTION = 14;
const SEUIL_STABLE_PCT = 2; // en dessous, on considère le poids stable

function joursEntre(dateA: string, dateB: string): number {
	const msParJour = 1000 * 60 * 60 * 24;
	return Math.round((new Date(dateB).getTime() - new Date(dateA).getTime()) / msParJour);
}

/** Compare la première et la dernière pesée de la période pour dégager une tendance simple — pas de
 * régression, l'objectif est une lecture honnête et lisible pour un propriétaire, pas un modèle. */
export function evaluerTendancePoids(
	historique: PeseeInput[],
	objectif: DERGoal | null
): EvaluationTendancePoids {
	if (historique.length < 2) {
		return { tendance: null, pctVariation: null, joursCouverts: null, suggestion: null };
	}

	const trie = [...historique].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
	const premiere = trie[0];
	const derniere = trie[trie.length - 1];
	const joursCouverts = joursEntre(premiere.recordedAt, derniere.recordedAt);
	const pctVariation = ((derniere.weightKg - premiere.weightKg) / premiere.weightKg) * 100;

	const tendance: TendancePoids =
		Math.abs(pctVariation) < SEUIL_STABLE_PCT ? 'STABLE' : pctVariation > 0 ? 'HAUSSE' : 'BAISSE';

	if (joursCouverts < DUREE_MIN_JOURS_POUR_SUGGESTION) {
		return {
			tendance,
			pctVariation,
			joursCouverts,
			suggestion: `Encore ${DUREE_MIN_JOURS_POUR_SUGGESTION - joursCouverts} jour(s) avant d'avoir assez de recul (2-3 semaines) pour juger si la ration doit être ajustée.`
		};
	}

	let suggestion: string | null = null;
	if (objectif === 'perte' && tendance !== 'BAISSE') {
		suggestion =
			"Le poids ne baisse pas malgré l'objectif de perte de poids. Une pratique vétérinaire usuelle est d'ajuster la ration d'environ 10% après 2-3 semaines sans résultat — décision à valider avec votre vétérinaire, jamais sous le RER.";
	} else if (objectif === 'prise' && tendance !== 'HAUSSE') {
		suggestion =
			"Le poids ne progresse pas malgré l'objectif de prise de poids. Une pratique vétérinaire usuelle est d'ajuster la ration d'environ 10% après 2-3 semaines sans résultat — décision à valider avec votre vétérinaire.";
	} else if ((objectif === null || objectif === 'maintien') && tendance !== 'STABLE') {
		suggestion = `Le poids a ${tendance === 'HAUSSE' ? 'augmenté' : 'diminué'} de ${Math.abs(pctVariation).toFixed(1)}% en ${joursCouverts} jours alors que l'objectif est un maintien. Vérifiez le dosage donné par rapport au calcul, et parlez-en à votre vétérinaire si l'écart se confirme.`;
	}

	return { tendance, pctVariation, joursCouverts, suggestion };
}
