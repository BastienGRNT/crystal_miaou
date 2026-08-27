// Miroir de app/src/lib/domain/nutrition.calc.ts et score.calc.ts (types de sortie exposés par l'API).

export type StatutNutriment = 'DEFICIT' | 'EXCES' | 'ATTENTION' | 'OK';

export type NomNutrimentValide =
	| 'proteines'
	| 'lipides'
	| 'calcium'
	| 'phosphore'
	| 'taurine'
	| 'glucides'
	| 'ratioCalciumPhosphore';

export interface SeuilNutriment {
	min: number | null;
	max: number | null;
}

export interface StatusParNutriment {
	nutriment: NomNutrimentValide;
	valeur: number;
	statut: StatutNutriment;
	seuil: SeuilNutriment;
	/** Position dans [0, 100] pour dessiner une jauge — pas la source de vérité du statut. */
	positionPct: number;
	/** À quel point `valeur` dépasse/reste sous le seuil franchi — null si la cible est respectée. */
	ratioEcart: number | null;
}

export type NiveauScore = 'excellent' | 'bon' | 'correct' | 'a_ameliorer' | 'insuffisant';
export type StatutAxe = 'ok' | 'attention' | 'probleme';
export type IdAxeScore = 'energie' | 'equilibre' | 'fiabilite';

export interface AxeScore {
	id: IdAxeScore;
	label: string;
	resume: string;
	points: number;
	pointsMax: number;
	statut: StatutAxe;
}

export type ImpactAction = 'fort' | 'moyen' | 'faible';

export interface ActionScore {
	id: string;
	titre: string;
	detail: string;
	impact: ImpactAction;
	href: string | null;
	hrefLabel: string | null;
}

export interface ScoreRation {
	score: number;
	niveau: NiveauScore;
	titre: string;
	verdict: string;
	axes: AxeScore[];
	actions: ActionScore[];
}
