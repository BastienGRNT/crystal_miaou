// Score de la ration du jour — traduit les indicateurs techniques (kcal vs DER, ratios
// nutritionnels, fiabilité des données saisies) en une note unique sur 100 et une conclusion
// lisible par un débutant : "est-ce que je peux y aller aujourd'hui ?".
//
// Ce fichier ne redéfinit AUCUN seuil nutritionnel : il consomme les statuts déjà produits par
// `validerRation` (nutrition.calc.ts, seuils issus de specs/nutrition-spec.md) et se contente de les
// pondérer. Modifier un seuil médical se fait dans nutrition.calc.ts, pas ici.

import {
	calculerRatioEcartSeuil,
	type NomNutrimentValide,
	type StatusParNutriment,
	type StatutNutriment
} from './nutrition.calc';

export type NiveauScore = 'excellent' | 'bon' | 'correct' | 'a_ameliorer' | 'insuffisant';

export type StatutAxe = 'ok' | 'attention' | 'probleme';

export type IdAxeScore = 'energie' | 'equilibre' | 'fiabilite';

export interface AxeScore {
	id: IdAxeScore;
	label: string;
	/** Une phrase, sans jargon : ce que cet axe dit du menu du jour. */
	resume: string;
	points: number;
	pointsMax: number;
	statut: StatutAxe;
}

export type ImpactAction = 'fort' | 'moyen' | 'faible';

export interface ActionScore {
	/** Stable, sert de clé d'affichage — pas montré à l'utilisateur. */
	id: string;
	titre: string;
	detail: string;
	impact: ImpactAction;
	href: string | null;
	hrefLabel: string | null;
}

export interface ScoreRation {
	/** 0 à 100, entier. */
	score: number;
	niveau: NiveauScore;
	/** Titre court affiché à côté de la note ("Excellent", "À améliorer"...). */
	titre: string;
	/** Le "go/no-go" en une phrase, adressé au propriétaire. */
	verdict: string;
	axes: AxeScore[];
	/** Triées : l'action la plus rentable d'abord. Vide = rien à corriger. */
	actions: ActionScore[];
}

export interface AlimentFiabiliteScore {
	foodId: string;
	foodName: string;
	emEstimee: boolean;
	humiditeEstimee: boolean;
	glucidesEstimes: boolean;
}

export interface AlimentGlucidesScore {
	foodId: string;
	foodName: string;
	pctMatiereSeche: number;
}

export interface ScoreRationInput {
	totalKcal: number;
	der: number;
	rer: number;
	statuts: StatusParNutriment[];
	fiabiliteParAliment: AlimentFiabiliteScore[];
	/** Trié du plus riche au moins riche en glucides (cf. repartition.service). */
	glucidesParAliment: AlimentGlucidesScore[];
	/** Nombre d'aliments distincts composant la ration du jour. */
	nombreAlimentsActifs: number;
}

// --- Pondération des trois axes (total 100) ---------------------------------
const POINTS_ENERGIE = 40;
const POINTS_EQUILIBRE = 40;
const POINTS_FIABILITE = 20;

const LABELS_NUTRIMENT: Record<NomNutrimentValide, string> = {
	proteines: 'protéines',
	lipides: 'lipides',
	calcium: 'calcium',
	phosphore: 'phosphore',
	taurine: 'taurine',
	glucides: 'glucides',
	ratioCalciumPhosphore: 'ratio calcium/phosphore'
};

/** Nutriments dont l'absence pénalise la fiabilité : rarement imprimés sur une étiquette grand
 * public, mais ce sont eux qui permettent de vérifier autre chose que "assez de calories". */
const NUTRIMENTS_VERIFIABLES: NomNutrimentValide[] = ['calcium', 'phosphore', 'taurine'];

// --- Axe 1 : couverture énergétique ----------------------------------------

function scorerEnergie(input: ScoreRationInput): AxeScore {
	const ecartPct = input.der > 0 ? ((input.totalKcal - input.der) / input.der) * 100 : 0;
	const ecartAbs = Math.abs(ecartPct);
	const sousLeRER = input.totalKcal < input.rer;

	let points: number;
	if (ecartAbs <= 3) points = POINTS_ENERGIE;
	else if (ecartAbs <= 7) points = 32;
	else if (ecartAbs <= 15) points = 20;
	else if (ecartAbs <= 30) points = 8;
	else points = 0;

	// Descendre sous le métabolisme de repos est un risque médical (lipidose hépatique), pas un
	// simple écart de rationnement : plafonne l'axe quel que soit l'écart au DER.
	if (sousLeRER) points = Math.min(points, 4);

	const statut: StatutAxe = sousLeRER || ecartAbs > 15 ? 'probleme' : ecartAbs > 7 ? 'attention' : 'ok';

	const ecartArrondi = Math.round(ecartAbs);
	let resume: string;
	if (sousLeRER) {
		resume = "La journée passe sous le minimum vital de votre chat — c'est trop peu.";
	} else if (ecartAbs <= 3) {
		resume = 'La journée couvre exactement le besoin calculé de votre chat.';
	} else if (ecartPct > 0) {
		resume = `La journée dépasse le besoin de ${ecartArrondi}%.`;
	} else {
		resume = `La journée couvre ${100 - ecartArrondi}% du besoin.`;
	}

	return { id: 'energie', label: 'Quantité donnée', resume, points, pointsMax: POINTS_ENERGIE, statut };
}

// --- Axe 2 : équilibre nutritionnel ----------------------------------------

/** Pénalité d'un statut hors cible : un franchissement de seuil médical (DEFICIT/EXCES) coûte plus
 * cher qu'un indicateur qualité (ATTENTION, cf. glucides), et un écart massif plus qu'un écart
 * limite. */
function penaliteStatut(statut: StatusParNutriment): number {
	if (statut.statut === 'OK') return 0;

	const ratio = calculerRatioEcartSeuil(statut.valeur, statut.seuil);
	const severe = ratio !== null && (ratio >= 1.5 || ratio <= 0.7);

	if (statut.statut === 'ATTENTION') return severe ? 9 : 6;
	return severe ? 14 : 10;
}

function scorerEquilibre(statuts: StatusParNutriment[]): AxeScore {
	const horsCible = statuts.filter((s) => s.statut !== 'OK');
	const penalites = horsCible.reduce((total, s) => total + penaliteStatut(s), 0);
	const points = Math.max(0, POINTS_EQUILIBRE - penalites);

	const aUnSeuilMedical = horsCible.some((s) => s.statut === 'DEFICIT' || s.statut === 'EXCES');
	const statut: StatutAxe = aUnSeuilMedical ? 'probleme' : horsCible.length > 0 ? 'attention' : 'ok';

	let resume: string;
	if (statuts.length === 0) {
		resume = "Pas assez de données sur vos aliments pour vérifier l'équilibre.";
	} else if (horsCible.length === 0) {
		resume = `Les ${statuts.length} repères vérifiables sont dans leur cible.`;
	} else {
		const noms = horsCible.map((s) => LABELS_NUTRIMENT[s.nutriment]).join(', ');
		resume = `Hors cible : ${noms}.`;
	}

	return { id: 'equilibre', label: 'Équilibre des apports', resume, points, pointsMax: POINTS_EQUILIBRE, statut };
}

// --- Axe 3 : fiabilité des données -----------------------------------------

function scorerFiabilite(input: ScoreRationInput): AxeScore {
	const emEstimee = input.fiabiliteParAliment.filter((a) => a.emEstimee).length;
	const autresEstimations = input.fiabiliteParAliment.filter(
		(a) => !a.emEstimee && (a.humiditeEstimee || a.glucidesEstimes)
	).length;
	const nutrimentsAbsents = NUTRIMENTS_VERIFIABLES.filter(
		(nom) => !input.statuts.some((s) => s.nutriment === nom)
	).length;

	const penalites = Math.min(10, emEstimee * 5) + Math.min(4, autresEstimations * 2) + nutrimentsAbsents * 2;
	const points = Math.max(0, POINTS_FIABILITE - penalites);

	const statut: StatutAxe = points >= 16 ? 'ok' : points >= 10 ? 'attention' : 'probleme';

	let resume: string;
	if (penalites === 0) {
		resume = 'Toutes les valeurs viennent des étiquettes que vous avez saisies.';
	} else if (emEstimee > 0 && nutrimentsAbsents > 0) {
		resume = `L'énergie de ${emEstimee} aliment${emEstimee > 1 ? 's' : ''} est estimée, et ${nutrimentsAbsents} nutriment${nutrimentsAbsents > 1 ? 's ne sont pas renseignés' : " n'est pas renseigné"}.`;
	} else if (emEstimee > 0) {
		resume = `L'énergie de ${emEstimee} aliment${emEstimee > 1 ? 's est estimée' : ' est estimée'} par l'app, pas lue sur le paquet.`;
	} else if (nutrimentsAbsents > 0) {
		resume = `${nutrimentsAbsents} nutriment${nutrimentsAbsents > 1 ? 's ne sont pas renseignés' : " n'est pas renseigné"} sur vos aliments.`;
	} else {
		resume = 'Quelques valeurs secondaires sont estimées par défaut.';
	}

	return { id: 'fiabilite', label: 'Fiabilité des données', resume, points, pointsMax: POINTS_FIABILITE, statut };
}

// --- Actions ----------------------------------------------------------------

const ORDRE_IMPACT: Record<ImpactAction, number> = { fort: 0, moyen: 1, faible: 2 };

function actionPourNutriment(
	statut: StatusParNutriment,
	input: ScoreRationInput
): ActionScore | null {
	const nom = LABELS_NUTRIMENT[statut.nutriment];

	if (statut.nutriment === 'glucides') {
		const pire = input.glucidesParAliment[0];
		return {
			id: 'glucides',
			titre: pire ? `Remplacer ${pire.foodName} par un produit moins sucré` : 'Réduire les glucides de la ration',
			detail: pire
				? `${pire.foodName} est l'aliment le plus riche en glucides de la ration (${pire.pctMatiereSeche.toFixed(0)}% de matière sèche). Un produit plus pauvre en féculents, ou une part de pâtée plus grande, fera baisser cet indicateur.`
				: 'Les croquettes contiennent souvent plus de glucides que la pâtée : augmenter la part de pâtée fait baisser cet indicateur.',
			impact: 'moyen',
			href: '/aliments',
			hrefLabel: 'Comparer mes aliments'
		};
	}

	if (statut.statut === 'DEFICIT') {
		return {
			id: `deficit-${statut.nutriment}`,
			titre: `Choisir un aliment plus riche en ${nom}`,
			detail: `La ration apporte ${statut.valeur.toFixed(1)} là où la cible est d'au moins ${statut.seuil.min}. Changer la quantité n'y fera rien : c'est la composition de l'aliment qu'il faut changer, ou la part croquette / pâtée.`,
			impact: 'fort',
			href: '/aliments',
			hrefLabel: 'Comparer mes aliments'
		};
	}

	return {
		id: `exces-${statut.nutriment}`,
		titre: `Faire baisser le ${nom} de la ration`,
		detail: `La ration apporte ${statut.valeur.toFixed(1)} pour une cible maximale de ${statut.seuil.max}. Là encore, c'est le choix d'aliment (ou la part croquette / pâtée) qui corrige, pas la quantité servie.`,
		impact: 'moyen',
		href: '/aliments',
		hrefLabel: 'Comparer mes aliments'
	};
}

function construireActions(input: ScoreRationInput, axeEnergie: AxeScore): ActionScore[] {
	const actions: ActionScore[] = [];

	if (input.totalKcal < input.rer) {
		actions.push({
			id: 'sous-rer',
			titre: 'Augmenter la ration du jour',
			detail: `La journée apporte ${Math.round(input.totalKcal)} kcal alors que le simple métabolisme au repos de votre chat en demande ${Math.round(input.rer)} kcal. Un jeûne relatif prolongé expose le chat à une lipidose hépatique : remontez les quantités, ou parlez-en à votre vétérinaire avant toute restriction.`,
			impact: 'fort',
			href: null,
			hrefLabel: null
		});
	} else if (axeEnergie.statut !== 'ok') {
		const trop = input.totalKcal > input.der;
		actions.push({
			id: 'ecart-der',
			titre: trop ? 'Réduire les quantités fixées à la main' : 'Compléter la journée',
			detail: trop
				? "Des créneaux verrouillés (ajustés au slider ou déjà cochés « donné ») empêchent l'app de descendre au besoin du jour. Déverrouillez-en un, ou réinitialisez la journée pour repartir du calcul automatique."
				: "Il manque des calories par rapport au besoin du jour : réinitialisez la journée pour laisser l'app recalculer, ou ajoutez un créneau à votre routine.",
			impact: 'fort',
			href: null,
			hrefLabel: null
		});
	}

	for (const statut of input.statuts) {
		if (statut.statut === 'OK') continue;
		const action = actionPourNutriment(statut, input);
		if (action) actions.push(action);
	}

	const alimentsEmEstimee = input.fiabiliteParAliment.filter((a) => a.emEstimee);
	if (alimentsEmEstimee.length > 0) {
		actions.push({
			id: 'em-estimee',
			titre: 'Saisir le kcal/100g du fabricant si vous le trouvez',
			detail: `Pour ${alimentsEmEstimee.map((a) => a.foodName).join(', ')}, l'app calcule l'énergie à partir de l'analyse nutritionnelle (méthode NRC 2006, celle des vétérinaires) faute de valeur sur l'étiquette. C'est fiable à quelques pourcents près ; la valeur du fabricant, si elle existe sur le site de la marque, supprime cette marge.`,
			impact: 'faible',
			href: '/aliments',
			hrefLabel: 'Compléter mes aliments'
		});
	}

	const nutrimentsAbsents = NUTRIMENTS_VERIFIABLES.filter(
		(nom) => !input.statuts.some((s) => s.nutriment === nom)
	);
	if (nutrimentsAbsents.length > 0) {
		actions.push({
			id: 'nutriments-absents',
			titre: `Renseigner ${nutrimentsAbsents.map((n) => LABELS_NUTRIMENT[n]).join(', ')} si l'étiquette les donne`,
			detail: "Ces valeurs sont facultatives sur un emballage : sans elles, l'app ne peut pas vérifier ces repères. Ce n'est pas un problème de santé, juste une partie du contrôle qu'elle ne peut pas faire.",
			impact: 'faible',
			href: '/aliments',
			hrefLabel: 'Compléter mes aliments'
		});
	}

	return actions.sort((a, b) => ORDRE_IMPACT[a.impact] - ORDRE_IMPACT[b.impact]);
}

// --- Niveau + verdict -------------------------------------------------------

interface PaletteNiveau {
	niveau: NiveauScore;
	titre: string;
	verdict: string;
}

function resoudreNiveau(score: number, aUnBlocage: boolean): PaletteNiveau {
	if (aUnBlocage) {
		return {
			niveau: score >= 55 ? 'a_ameliorer' : 'insuffisant',
			titre: 'À corriger',
			verdict: "Ne donnez pas cette journée telle quelle : un point important sort des clous. L'action à faire est juste en dessous."
		};
	}
	if (score >= 85) {
		return {
			niveau: 'excellent',
			titre: 'Excellent',
			verdict: 'Vous pouvez y aller : le menu du jour couvre le besoin de votre chat et respecte tous les repères que l’app sait vérifier.'
		};
	}
	if (score >= 70) {
		return {
			niveau: 'bon',
			titre: 'Bon',
			verdict: 'Vous pouvez y aller : rien de bloquant aujourd’hui. Une ou deux améliorations possibles, listées ci-dessous.'
		};
	}
	if (score >= 55) {
		return {
			niveau: 'correct',
			titre: 'Correct',
			verdict: 'C’est donnable aujourd’hui, mais l’alimentation de votre chat gagnerait à être ajustée — voyez les pistes ci-dessous.'
		};
	}
	if (score >= 40) {
		return {
			niveau: 'a_ameliorer',
			titre: 'À améliorer',
			verdict: 'Cette alimentation dépanne, mais elle n’est pas idéale sur la durée. Les pistes ci-dessous sont classées par impact.'
		};
	}
	return {
		niveau: 'insuffisant',
		titre: 'Insuffisant',
		verdict: 'Cette alimentation ne convient pas telle quelle sur la durée. Commencez par la première action ci-dessous, et parlez-en à votre vétérinaire.'
	};
}

/** Note globale de la ration du jour : trois axes pondérés (quantité, équilibre, fiabilité des
 * données), une conclusion en une phrase, et les actions concrètes triées par impact. */
export function calculerScoreRation(input: ScoreRationInput): ScoreRation {
	const axeEnergie = scorerEnergie(input);
	const axeEquilibre = scorerEquilibre(input.statuts);
	const axeFiabilite = scorerFiabilite(input);

	const score = Math.round(axeEnergie.points + axeEquilibre.points + axeFiabilite.points);

	// Un axe "problème" sur la quantité ou l'équilibre est un signal médical : il prime sur la note
	// brute, qui pourrait rester flatteuse grâce aux deux autres axes.
	const aUnBlocage = axeEnergie.statut === 'probleme' || axeEquilibre.statut === 'probleme';
	const { niveau, titre, verdict } = resoudreNiveau(score, aUnBlocage);

	return {
		score,
		niveau,
		titre,
		verdict,
		axes: [axeEnergie, axeEquilibre, axeFiabilite],
		actions: construireActions(input, axeEnergie)
	};
}

/** Statut d'un nutriment → statut d'axe, pour réutiliser la même palette de couleurs dans l'UI. */
export function statutAxeDepuisStatutNutriment(statut: StatutNutriment): StatutAxe {
	if (statut === 'OK') return 'ok';
	if (statut === 'ATTENTION') return 'attention';
	return 'probleme';
}
