// Moteur de répartition du menu du jour (specs section 3 du prompt de refonte).
//
// Principe : le besoin total du jour (DER) est fixé par le calcul nutritionnel (nutrition.calc.ts).
// La friandise (si active) est une quantité fixe choisie par l'utilisateur, retranchée en premier.
// Sur le budget restant : si pâtée ET croquette sont actives, le budget est partagé par défaut à parts
// égales entre les deux (spec section 3, Cas B — répartition libre, Option 1 ratio calorique) — la
// pâtée ne doit jamais "maximiser" et laisser la croquette n'absorber qu'un résidu marginal. Si un seul
// des deux est actif, il couvre seul tout le budget restant. Le nombre de paquets de pâtée acheté/ouvert
// pour la journée est un ENTIER (jamais un demi ou un tiers de paquet — la pâtée coûte cher, on n'ouvre
// pas un paquet de plus pour un écart marginal) ; une fois ce total figé, il est en revanche réparti
// entre les créneaux au demi-paquet près (une pâtée ouverte se partage en deux repas sans problème). La
// croquette absorbe ensuite le budget calorique qu'il reste réellement après la pâtée. Ce budget n'est
// pas réparti à parts égales entre ses créneaux mais au prorata d'un objectif kcal par créneau (durée
// pondérée jusqu'au repas suivant × taux kcal/minute uniforme sur la journée, nuit atténuée) DONT ON
// DÉDUIT les kcal déjà apportées au même horaire par la pâtée ou la friandise (`calculerPoidsGapCroquette`)
// — une pâtée donnée à 8h fait directement baisser la portion de croquette du créneau de 8h, pas
// seulement le total du jour. Un créneau verrouillé (ajusté manuellement ou déjà "donné") garde sa
// quantité, jamais recalculée.

import { arrondirGrammes } from '$lib/domain/nutrition.calc';

export type RepartitionFoodType = 'croquette' | 'patee' | 'friandise';

const TOLERANCE_G = 0.5;

/** Écart entre le total réel du jour et le DER, en fraction du DER, au-delà duquel on rééquilibre
 * automatiquement plutôt que de se contenter d'un avertissement : un ajustement manuel isolé ne doit
 * pas laisser la journée dériver franchement (trop ou pas assez) sans réaction du système. En-dessous
 * de ce seuil, un petit écart volontaire est toléré sans y toucher. */
const SEUIL_REEQUILIBRAGE_RATIO = 0.1;

/** Part par défaut du budget calorique restant (après friandise) allouée à la pâtée quand croquette
 * ET pâtée sont actives simultanément — 50/50, ajustable ensuite par l'utilisateur via le slider. */
const RATIO_PATEE_QUAND_CROQUETTE_ACTIVE = 0.5;

/** Divise un total en `nombreParts` parts égales (arrondies), en corrigeant la dernière part pour
 * que la somme reste exactement `totalG`. */
export function repartirPaquetEnParts(totalG: number, nombreParts: number): number[] {
	if (nombreParts <= 0) return [];

	const partBrute = totalG / nombreParts;
	const parts = Array(nombreParts).fill(arrondirGrammes(partBrute));

	const sommeArrondie = parts.reduce((somme: number, part: number) => somme + part, 0);
	const ecart = totalG - sommeArrondie;
	parts[nombreParts - 1] = arrondirGrammes(parts[nombreParts - 1] + ecart);

	return parts;
}

/** Nombre ENTIER de paquets de pâtée par jour qui couvre au mieux `cibleKcal` — jamais un demi ou un
 * tiers de paquet, jamais moins d'un paquet tant que la pâtée est active. Arrondi "moitié vers le bas" :
 * à égale distance entre N et N+1 paquets, on reste à N. La pâtée coûte cher, donc en cas d'hésitation
 * réelle entre les deux (l'écart au DER ne permet pas de trancher), le score du jour (score.calc.ts)
 * juge un léger déficit calorique moins sévèrement qu'un léger excès n'est pénalisé pour rien — mieux
 * vaut ouvrir un paquet de moins et laisser la croquette (moins chère) absorber la différence. */
export function calculerNombrePaquetsPatee(cibleKcal: number, kcalParPaquet: number): number {
	if (kcalParPaquet <= 0) return 0;
	const ratio = cibleKcal / kcalParPaquet;
	return Math.max(1, Math.ceil(ratio - 0.5));
}

/** Aligne une quantité de pâtée sur le pas de conditionnement : toujours un multiple d'un demi-paquet
 * (0, 0.5, 1, 1.5 paquet...), jamais un quart ou un tiers — ce n'est pas mesurable sur une balance de
 * cuisine et une pâtée entamée aux 3/4 ne se conserve pas comme une pâtée entamée de moitié. */
export function arrondirAuDemiPaquet(quantiteG: number, packageSizeG: number): number {
	if (packageSizeG <= 0) return quantiteG;
	const demiPaquetG = packageSizeG / 2;
	return Math.round(quantiteG / demiPaquetG) * demiPaquetG;
}

/** Répartit un nombre entier d'« unités » (ex: demi-paquets) sur `nombreParts`, au plus égal possible,
 * en entiers exacts (pas d'arrondi flottant possible sur des entiers). */
function repartirEntiersEnParts(total: number, nombreParts: number): number[] {
	if (nombreParts <= 0) return [];
	const base = Math.floor(total / nombreParts);
	const reste = total - base * nombreParts;
	return Array.from({ length: nombreParts }, (_, i) => base + (i < reste ? 1 : 0));
}

export interface SlotEtat {
	id: string;
	foodType: RepartitionFoodType;
	/** Verrouillé = quantité figée (ajustement manuel via slider, ou déjà coché "donné") : jamais recalculée. */
	locked: boolean;
	quantiteActuelleG: number;
	/** Heure du créneau en minutes depuis minuit (0-1439). Optionnel : sans elle, un créneau croquette
	 * revient à une part égale au lieu d'une part pondérée par l'attente avant le repas suivant (cf.
	 * `calculerPoidsGapCroquette`) — dégradation silencieuse plutôt qu'erreur, l'heure n'est pas
	 * indispensable pour le reste du calcul. */
	heureMinutes?: number;
}

export interface AlimentActifInput {
	kcal100g: number;
}

export interface PateeActiveInput extends AlimentActifInput {
	packageSizeG: number;
	/** Nombre de paquets/jour fixé explicitement par l'utilisateur (Cas A de la spec) : remplace le
	 * calcul automatique basé sur le budget calorique tant qu'il est renseigné. */
	nombrePaquetsOverride?: number | null;
}

export interface FriandiseActiveInput extends AlimentActifInput {
	quantiteTotaleG: number;
}

export interface CalculerRepartitionInput {
	der: number;
	croquette: AlimentActifInput | null;
	patee: PateeActiveInput | null;
	friandise: FriandiseActiveInput | null;
	slots: SlotEtat[];
}

export interface CalculerRepartitionResultatSlot {
	id: string;
	quantiteG: number;
}

export interface CalculerRepartitionResultat {
	slots: CalculerRepartitionResultatSlot[];
	nombrePaquetsPatee: number | null;
	totalCibleKcal: number;
	avertissements: string[];
}

interface DistributionResultat {
	quantites: Map<string, number>;
	avertissement: string | null;
}

const MINUTES_PAR_JOUR = 1440;
/** Fenêtre nocturne : le chat dort, une longue attente sur ce créneau est normale et ne doit pas
 * gonfler artificiellement la portion du repas qui la précède (contrairement à la même durée d'attente
 * en pleine journée, qui elle traduit un vrai trou dans le rythme des repas). */
const NUIT_DEBUT_MIN = 22 * 60;
const NUIT_FIN_MIN = 7 * 60;
/** Poids d'une minute nocturne dans le calcul de l'attente, relatif à une minute de jour (1.0). */
const POIDS_MINUTE_NUIT = 0.4;

function chevauchementMin(aDebut: number, aFin: number, bDebut: number, bFin: number): number {
	return Math.max(0, Math.min(aFin, bFin) - Math.max(aDebut, bDebut));
}

/** Durée pondérée (en minutes) de l'intervalle [`debutMin`, `debutMin + dureeMin`) : les minutes qui
 * tombent dans la fenêtre nocturne (22h-7h) comptent pour `POIDS_MINUTE_NUIT` au lieu de 1. `debutMin`
 * dans [0, 1440), `dureeMin` dans (0, 1440] — au plus un passage de minuit à gérer. */
function dureeAttentePondereeMin(debutMin: number, dureeMin: number): number {
	const finJour1 = Math.min(debutMin + dureeMin, MINUTES_PAR_JOUR);
	let nuitMin =
		chevauchementMin(debutMin, finJour1, 0, NUIT_FIN_MIN) +
		chevauchementMin(debutMin, finJour1, NUIT_DEBUT_MIN, MINUTES_PAR_JOUR);

	const finJour2 = debutMin + dureeMin - MINUTES_PAR_JOUR;
	if (finJour2 > 0) {
		nuitMin += chevauchementMin(0, finJour2, 0, NUIT_FIN_MIN) + chevauchementMin(0, finJour2, NUIT_DEBUT_MIN, MINUTES_PAR_JOUR);
	}

	return dureeMin - nuitMin * (1 - POIDS_MINUTE_NUIT);
}

/** Durée pondérée totale d'une journée complète (24h) : les gaps entre créneaux, mis bout à bout sur
 * un cycle de 24h, couvrent toujours exactement cette durée quel que soit le nombre ou le placement des
 * créneaux — c'est le dénominateur du taux kcal/minute cible (cf. `calculerPoidsGapCroquette`). */
const MINUTES_JOUR_PONDEREES = dureeAttentePondereeMin(0, MINUTES_PAR_JOUR);

/** Poids de chaque créneau croquette non verrouillé = le déficit kcal entre l'objectif de ce créneau et
 * ce qui lui est déjà apporté par la pâtée/la friandise/une croquette déjà verrouillée au même horaire.
 *
 * L'objectif d'un créneau est `durée pondérée jusqu'au repas suivant × taux kcal/minute`, le taux étant
 * fixe sur la journée (`der / MINUTES_JOUR_PONDEREES`, minutes nocturnes comptées à `POIDS_MINUTE_NUIT`)
 * — spec conversation : "pour une journée de 238kcal on vise 9kcal par heure [...] si il a 8h avant le
 * prochain repas il lui faut 8h × 9kcal, pâtée et croquette comprises". Si une pâtée est donnée au même
 * horaire qu'une croquette, ses kcal sont déduites de l'objectif AVANT de peser cette croquette : une
 * demi-pâtée à 8h fait mécaniquement baisser la part de croquette de ce créneau, pas seulement le total
 * du jour. Un créneau dont la pâtée/friandise couvre déjà tout l'objectif reçoit un poids de 0 —
 * `repartirParPoids` (côté appelant) répartit alors le reste du budget sur les autres créneaux croquette
 * sans jamais perdre de kcal, la pondération ne servant qu'à répartir un total déjà fixé ailleurs.
 *
 * Renvoie une map vide si aucun créneau n'a d'heure connue (`heureMinutes` absent) — le fallback vers un
 * partage égal se fait côté appelant. */
export function calculerPoidsGapCroquette(
	slots: SlotEtat[],
	der: number,
	kcalDejaDonneParHeure: Map<number, number>
): Map<string, number> {
	const poids = new Map<string, number>();
	const avecHeure = slots.filter(
		(s): s is SlotEtat & { heureMinutes: number } => s.heureMinutes !== undefined
	);
	if (avecHeure.length === 0) return poids;

	// Heures DISTINCTES seulement : deux créneaux à la même heure (ex: pâtée et croquette toutes les
	// deux à 8h) ne doivent pas se voir l'un l'autre comme "le repas suivant" — sinon l'écart brut vaut 0,
	// et 0 tombait auparavant dans le même cas que "aucun autre horaire dans la journée", ce qui gonflait
	// ce créneau à un poids de 24h pleines (bug observé : 30g à 8h alors qu'une pâtée était donnée en même
	// temps, contre 3-11g sur les autres créneaux). Le prochain repas réel est celui de l'heure suivante
	// STRICTEMENT différente, quel que soit son type.
	const heuresDistinctes = [...new Set(avecHeure.map((s) => s.heureMinutes))].sort((a, b) => a - b);
	const tauxKcalParMinute = der / MINUTES_JOUR_PONDEREES;

	for (const slot of avecHeure) {
		if (slot.foodType !== 'croquette' || slot.locked) continue;

		// Une seule heure dans toute la journée (tous les repas au même moment) : pas de "suivant" au
		// sens propre, on retombe sur une journée complète.
		let gap = MINUTES_PAR_JOUR;
		if (heuresDistinctes.length > 1) {
			const heureSuivante = heuresDistinctes.find((h) => h > slot.heureMinutes) ?? heuresDistinctes[0];
			const brut = ((heureSuivante - slot.heureMinutes) % MINUTES_PAR_JOUR + MINUTES_PAR_JOUR) % MINUTES_PAR_JOUR;
			gap = brut || MINUTES_PAR_JOUR;
		}
		const objectifKcal = dureeAttentePondereeMin(slot.heureMinutes, gap) * tauxKcalParMinute;
		const dejaDonneKcal = kcalDejaDonneParHeure.get(slot.heureMinutes) ?? 0;
		poids.set(slot.id, Math.max(0, objectifKcal - dejaDonneKcal));
	}

	return poids;
}

/** Kcal déjà apportées à chaque horaire du jour par la pâtée, la friandise, et toute croquette déjà
 * verrouillée — sert de base à `calculerPoidsGapCroquette` pour ne pas surcharger un créneau croquette
 * qui coïncide avec un autre repas déjà calorique. `quantitesConnues` doit déjà contenir les grammes
 * pâtée/friandise du jour (calculés avant la croquette, cf. `calculerRepartitionJournaliere`). */
function construireKcalDejaDonneParHeure(
	slots: SlotEtat[],
	quantitesConnues: Map<string, number>,
	kcal100gParType: Partial<Record<RepartitionFoodType, number>>
): Map<number, number> {
	const kcalParHeure = new Map<number, number>();

	for (const s of slots) {
		if (s.heureMinutes === undefined) continue;
		if (s.foodType === 'croquette' && !s.locked) continue;

		const kcal100g = kcal100gParType[s.foodType];
		if (!kcal100g) continue;

		const grammes = quantitesConnues.get(s.id) ?? s.quantiteActuelleG;
		const kcal = (grammes / 100) * kcal100g;
		kcalParHeure.set(s.heureMinutes, (kcalParHeure.get(s.heureMinutes) ?? 0) + kcal);
	}

	return kcalParHeure;
}

/** Répartit `totalG` sur `poids.length` parts proportionnelles à `poids`, en préservant la somme exacte
 * (l'écart d'arrondi est corrigé sur la part la plus grosse, pour limiter la distorsion relative). */
function repartirParPoids(totalG: number, poids: number[]): number[] {
	const sommePoids = poids.reduce((somme, p) => somme + p, 0);
	if (sommePoids <= 0) return repartirPaquetEnParts(totalG, poids.length);

	const parts = poids.map((p) => arrondirGrammes((p / sommePoids) * totalG));
	const sommeArrondie = parts.reduce((somme, p) => somme + p, 0);
	const ecart = totalG - sommeArrondie;

	let idxMax = 0;
	for (let i = 1; i < parts.length; i++) if (parts[i] > parts[idxMax]) idxMax = i;
	parts[idxMax] = arrondirGrammes(parts[idxMax] + ecart);

	return parts;
}

/** Répartit `totalG` sur les créneaux non verrouillés d'un même type, en préservant la quantité des
 * créneaux verrouillés. Alerte si le reste devient négatif (excès) ou si tous les créneaux restants sont
 * verrouillés sans que le total corresponde (le chat n'aura pas son compte). `uniteAlignementG`, quand
 * fourni (pâtée : demi-paquet), force chaque part non verrouillée à être un multiple exact de cette
 * unité plutôt qu'une part au gramme près. `poidsParId`, quand fourni et non vide (croquette), répartit
 * au prorata de ce poids au lieu de parts égales. */
function distribuerType(
	totalG: number,
	slotsType: SlotEtat[],
	labelType: string,
	uniteAlignementG?: number,
	poidsParId?: Map<string, number>
): DistributionResultat {
	const quantites = new Map<string, number>();
	const verrouilles = slotsType.filter((s) => s.locked);
	const nonVerrouilles = slotsType.filter((s) => !s.locked);

	for (const s of verrouilles) quantites.set(s.id, s.quantiteActuelleG);

	const sommeVerrouillee = verrouilles.reduce((somme, s) => somme + s.quantiteActuelleG, 0);
	const reste = arrondirGrammes(totalG - sommeVerrouillee);

	if (nonVerrouilles.length === 0) {
		if (Math.abs(reste) > TOLERANCE_G) {
			return {
				quantites,
				avertissement:
					reste > 0
						? `Tous les créneaux ${labelType} sont déjà fixés mais il manque ${reste} g pour couvrir le besoin du jour.`
						: `Tous les créneaux ${labelType} sont déjà fixés et dépassent le besoin du jour de ${-reste} g.`
			};
		}
		return { quantites, avertissement: null };
	}

	if (reste <= 0) {
		for (const s of nonVerrouilles) quantites.set(s.id, 0);
		return {
			quantites,
			avertissement:
				reste < 0
					? `Les créneaux ${labelType} déjà fixés dépassent déjà le besoin du jour de ${-reste} g — le chat recevra plus que nécessaire.`
					: null
		};
	}

	if (uniteAlignementG && uniteAlignementG > 0) {
		const totalUnites = Math.round(reste / uniteAlignementG);
		const unites = repartirEntiersEnParts(totalUnites, nonVerrouilles.length);
		nonVerrouilles.forEach((s, i) => quantites.set(s.id, arrondirGrammes(unites[i] * uniteAlignementG)));
		return { quantites, avertissement: null };
	}

	const poidsNonVerrouilles = nonVerrouilles.map((s) => poidsParId?.get(s.id) ?? 0);
	const parts =
		poidsParId && poidsNonVerrouilles.some((p) => p > 0)
			? repartirParPoids(reste, poidsNonVerrouilles)
			: repartirPaquetEnParts(reste, nonVerrouilles.length);
	nonVerrouilles.forEach((s, i) => quantites.set(s.id, parts[i]));
	return { quantites, avertissement: null };
}

/** Réduit (ou augmente) proportionnellement la quantité des `slots` fournis pour absorber
 * `ecartKcalACorriger` (positif = trop de kcal à retirer, négatif = kcal manquantes à ajouter),
 * jamais en dessous de `planchG` (ex: le demi-paquet minimum tant que la pâtée est active) ni de 0.
 * Renvoie l'écart kcal qui n'a pas pu être absorbé (0 si tout a été compensé), pour enchaîner sur un
 * autre groupe de créneaux si besoin. Ne modifie jamais un créneau verrouillé (ni un créneau déjà
 * "donné", qui est toujours reçu ici avec `locked: true`) : seul l'utilisateur peut revenir sur un
 * choix explicite, le système ne fait que redistribuer la marge disponible autour. */
function appliquerCorrectionProportionnelle(
	slots: SlotEtat[],
	quantitesParId: Map<string, number>,
	kcal100g: number,
	ecartKcalACorriger: number,
	options?: { uniteAlignementG?: number; planchG?: number }
): number {
	if (slots.length === 0 || kcal100g <= 0 || Math.abs(ecartKcalACorriger) <= TOLERANCE_G) {
		return ecartKcalACorriger;
	}

	const grammesActuels = slots.reduce((somme, s) => somme + (quantitesParId.get(s.id) ?? 0), 0);
	if (grammesActuels <= TOLERANCE_G) return ecartKcalACorriger;

	const planchG = options?.planchG ?? 0;
	const grammesEcart = (ecartKcalACorriger / kcal100g) * 100;
	const grammesCibles = Math.max(planchG, grammesActuels - grammesEcart);
	const facteur = grammesCibles / grammesActuels;

	for (const slot of slots) {
		const actuelle = quantitesParId.get(slot.id) ?? 0;
		let nouvelle = actuelle * facteur;
		if (options?.uniteAlignementG) {
			nouvelle = Math.round(nouvelle / options.uniteAlignementG) * options.uniteAlignementG;
		}
		quantitesParId.set(slot.id, arrondirGrammes(Math.max(0, nouvelle)));
	}

	const grammesAppliques = grammesActuels - grammesCibles;
	const kcalAppliquee = (grammesAppliques / 100) * kcal100g;
	return arrondirGrammes(ecartKcalACorriger - kcalAppliquee);
}

const LABELS_TYPE: Record<RepartitionFoodType, string> = {
	croquette: 'croquette',
	patee: 'pâtée',
	friandise: 'friandise'
};

/** Calcule la quantité de chaque créneau du jour pour que, au total, le chat reçoive exactement son
 * besoin (DER) — ni trop, ni trop peu — tout en respectant les créneaux déjà verrouillés (ajustés
 * manuellement ou donnés). Friandise : quantité fixe choisie par l'utilisateur, retranchée en premier.
 * Pâtée : nombre ENTIER de paquets au plus proche du budget qui lui est alloué (arrondi moitié vers le
 * bas, cf. `calculerNombrePaquetsPatee`) — la totalité du budget restant si elle est seule, la moitié si
 * la croquette est aussi active (répartition par défaut, ajustable ensuite créneau par créneau).
 * Croquette : complète ce qu'il reste réellement du budget, réparti entre ses créneaux au prorata du
 * temps d'attente jusqu'au repas suivant plutôt qu'à parts égales. */
export function calculerRepartitionJournaliere(input: CalculerRepartitionInput): CalculerRepartitionResultat {
	const avertissements: string[] = [];

	let friandiseTotalG = 0;
	let friandiseTotalKcal = 0;
	if (input.friandise) {
		friandiseTotalG = input.friandise.quantiteTotaleG;
		friandiseTotalKcal = (friandiseTotalG / 100) * input.friandise.kcal100g;
	}

	const budgetPrincipauxKcal = input.der - friandiseTotalKcal;

	let nombrePaquetsPatee: number | null = null;
	let pateeTotalG = 0;
	let pateeTotalKcal = 0;
	if (input.patee) {
		if (input.patee.nombrePaquetsOverride) {
			nombrePaquetsPatee = input.patee.nombrePaquetsOverride;
		} else {
			const kcalParPaquet = (input.patee.packageSizeG / 100) * input.patee.kcal100g;
			const budgetPateeKcal = input.croquette
				? budgetPrincipauxKcal * RATIO_PATEE_QUAND_CROQUETTE_ACTIVE
				: budgetPrincipauxKcal;
			nombrePaquetsPatee = calculerNombrePaquetsPatee(budgetPateeKcal, kcalParPaquet);
		}
		pateeTotalG = nombrePaquetsPatee * input.patee.packageSizeG;
		pateeTotalKcal = (pateeTotalG / 100) * input.patee.kcal100g;
	}

	let croquetteTotalG = 0;
	if (input.croquette) {
		const budgetKcal = input.der - pateeTotalKcal - friandiseTotalKcal;
		if (budgetKcal < 0) {
			avertissements.push(
				`La pâtée et/ou la friandise dépassent déjà le besoin du jour de ${arrondirGrammes(-budgetKcal)} kcal — aucune croquette ajoutée aujourd'hui.`
			);
		} else {
			croquetteTotalG = arrondirGrammes(budgetKcal / (input.croquette.kcal100g / 100));
		}
	} else if (input.patee) {
		const ecartKcal = pateeTotalKcal + friandiseTotalKcal - input.der;
		if (ecartKcal > TOLERANCE_G) {
			avertissements.push(
				`Sans croquette pour compenser, ${nombrePaquetsPatee} paquet(s) de pâtée dépassent le besoin du jour de ${Math.round(ecartKcal)} kcal.`
			);
		} else if (ecartKcal < -TOLERANCE_G) {
			avertissements.push(
				`Sans croquette pour compléter, ${nombrePaquetsPatee} paquet(s) de pâtée ne couvrent pas tout le besoin du jour (${Math.round(-ecartKcal)} kcal manquants).`
			);
		}
	}

	const totauxParType: Record<RepartitionFoodType, number> = {
		patee: pateeTotalG,
		croquette: croquetteTotalG,
		friandise: friandiseTotalG
	};

	const uniteAlignementParType: Partial<Record<RepartitionFoodType, number>> = input.patee
		? { patee: input.patee.packageSizeG / 2 }
		: {};

	// Pâtée et friandise d'abord : la croquette a besoin de connaître leurs grammes par horaire pour
	// ne pas surcharger un créneau qui coïncide déjà avec un autre repas calorique (cf.
	// `calculerPoidsGapCroquette`) — la croquette est calculée en dernier.
	const quantitesParId = new Map<string, number>();
	for (const foodType of ['patee', 'friandise', 'croquette'] as const) {
		const slotsType = input.slots.filter((s) => s.foodType === foodType);
		if (slotsType.length === 0) continue;

		let poidsParId: Map<string, number> | undefined;
		if (foodType === 'croquette') {
			const kcalDejaDonneParHeure = construireKcalDejaDonneParHeure(input.slots, quantitesParId, {
				patee: input.patee?.kcal100g,
				friandise: input.friandise?.kcal100g,
				croquette: input.croquette?.kcal100g
			});
			poidsParId = calculerPoidsGapCroquette(input.slots, input.der, kcalDejaDonneParHeure);
		}

		const { quantites, avertissement } = distribuerType(
			totauxParType[foodType],
			slotsType,
			LABELS_TYPE[foodType],
			uniteAlignementParType[foodType],
			poidsParId
		);
		for (const [id, quantite] of quantites) quantitesParId.set(id, quantite);
		if (avertissement) avertissements.push(avertissement);
	}

	// Rééquilibrage automatique : un ajustement manuel (créneau verrouillé) peut faire dériver le total
	// du jour loin du DER au-delà de ce que la répartition par type peut absorber seule (ex: créneau
	// bloqué à une grosse valeur). Si l'écart dépasse ±10% du DER, on répartit l'excès/le manque sur les
	// créneaux NON verrouillés restants — croquette en priorité (levier continu, sans contrainte de
	// conditionnement), puis pâtée en dernier recours (par demi-paquet, jamais sous le demi-paquet
	// minimum). Les créneaux verrouillés ou déjà "donnés" ne sont jamais touchés : seul l'utilisateur
	// peut revenir sur un choix explicite.
	const totalKcalJour = input.slots.reduce((somme, s) => {
		const kcal100g =
			s.foodType === 'croquette' ? input.croquette?.kcal100g : s.foodType === 'patee' ? input.patee?.kcal100g : input.friandise?.kcal100g;
		return somme + (kcal100g ? ((quantitesParId.get(s.id) ?? 0) / 100) * kcal100g : 0);
	}, 0);
	const seuilKcal = input.der * SEUIL_REEQUILIBRAGE_RATIO;
	const ecartInitialKcal = totalKcalJour - input.der;

	if (Math.abs(ecartInitialKcal) > seuilKcal) {
		let ecartRestant = ecartInitialKcal;

		if (input.croquette) {
			const croquettesLibres = input.slots.filter((s) => s.foodType === 'croquette' && !s.locked);
			ecartRestant = appliquerCorrectionProportionnelle(croquettesLibres, quantitesParId, input.croquette.kcal100g, ecartRestant);
		}

		if (Math.abs(ecartRestant) > TOLERANCE_G && input.patee) {
			const pateesLibres = input.slots.filter((s) => s.foodType === 'patee' && !s.locked);
			const demiPaquetG = input.patee.packageSizeG / 2;
			ecartRestant = appliquerCorrectionProportionnelle(pateesLibres, quantitesParId, input.patee.kcal100g, ecartRestant, {
				uniteAlignementG: demiPaquetG,
				planchG: demiPaquetG
			});
		}

		if (Math.abs(ecartInitialKcal - ecartRestant) > TOLERANCE_G) {
			avertissements.push(
				`Cet ajustement manuel écartait la journée du besoin de ${Math.round(Math.abs(ecartInitialKcal))} kcal — les créneaux non verrouillés restants ont été réajustés automatiquement pour recoller au besoin du jour (${Math.round(input.der)} kcal).`
			);
		}

		if (Math.abs(ecartRestant) > seuilKcal) {
			avertissements.push(
				`Même après réajustement automatique, la journée reste écartée du besoin de ${Math.round(Math.abs(ecartRestant))} kcal : pas assez de créneaux non verrouillés pour compenser entièrement. Déverrouillez-en un ou réinitialisez la journée.`
			);
		}
	}

	return {
		slots: input.slots.map((s) => ({ id: s.id, quantiteG: quantitesParId.get(s.id) ?? 0 })),
		nombrePaquetsPatee,
		totalCibleKcal: input.der,
		avertissements
	};
}
