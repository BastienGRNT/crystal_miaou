// Moteur de répartition du menu du jour (specs section 3 du prompt de refonte).
//
// Principe : le besoin total du jour (DER) est fixé par le calcul nutritionnel (nutrition.calc.ts).
// La friandise (si active) est une quantité fixe choisie par l'utilisateur, retranchée en premier.
// Sur le budget restant : si pâtée ET croquette sont actives, le budget est partagé par défaut à parts
// égales entre les deux (spec section 3, Cas B — répartition libre, Option 1 ratio calorique) — la
// pâtée ne doit jamais "maximiser" et laisser la croquette n'absorber qu'un résidu marginal. Si un seul
// des deux est actif, il couvre seul tout le budget restant. La pâtée se raisonne en demi-paquets
// (jamais un quart ou un tiers de paquet — ça ne se mesure pas sur une balance de cuisine domestique) ;
// la croquette absorbe ensuite le budget calorique qu'il reste réellement après la pâtée. Chaque type a
// un total figé pour la journée ; ce total est réparti entre les créneaux NON verrouillés de ce type
// (à parts égales, alignées sur le demi-paquet pour la pâtée) — un créneau verrouillé (ajusté
// manuellement ou déjà "donné") garde sa quantité, jamais recalculée.

import { arrondirGrammes } from '$lib/domain/nutrition.calc';

export type RepartitionFoodType = 'croquette' | 'patee' | 'friandise';

const TOLERANCE_G = 0.5;

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

/** Nombre de paquets de pâtée (par pas de demi-paquet — jamais de quart ou de tiers) qui couvrent au
 * mieux `cibleKcal` : arrondi au demi-paquet le plus proche, jamais moins d'un demi-paquet tant que la
 * pâtée est active (un chat qui reçoit de la pâtée en reçoit au moins un demi-paquet). */
export function calculerNombrePaquetsPatee(cibleKcal: number, kcalParPaquet: number): number {
	if (kcalParPaquet <= 0) return 0;
	const demiPaquets = Math.max(1, Math.round((cibleKcal / kcalParPaquet) * 2));
	return demiPaquets / 2;
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

/** Répartit `totalG` sur les créneaux non verrouillés d'un même type, à parts égales, en préservant
 * la quantité des créneaux verrouillés. Alerte si le reste devient négatif (excès) ou si tous les
 * créneaux restants sont verrouillés sans que le total corresponde (le chat n'aura pas son compte).
 * `uniteAlignementG`, quand fourni (pâtée : demi-paquet), force chaque part non verrouillée à être un
 * multiple exact de cette unité plutôt qu'une part au gramme près. */
function distribuerType(
	totalG: number,
	slotsType: SlotEtat[],
	labelType: string,
	uniteAlignementG?: number
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

	const parts = repartirPaquetEnParts(reste, nonVerrouilles.length);
	nonVerrouilles.forEach((s, i) => quantites.set(s.id, parts[i]));
	return { quantites, avertissement: null };
}

const LABELS_TYPE: Record<RepartitionFoodType, string> = {
	croquette: 'croquette',
	patee: 'pâtée',
	friandise: 'friandise'
};

/** Calcule la quantité de chaque créneau du jour pour que, au total, le chat reçoive exactement son
 * besoin (DER) — ni trop, ni trop peu — tout en respectant les créneaux déjà verrouillés (ajustés
 * manuellement ou donnés). Friandise : quantité fixe choisie par l'utilisateur, retranchée en premier.
 * Pâtée : nombre de demi-paquets au plus proche du budget qui lui est alloué — la totalité du budget
 * restant si elle est seule, la moitié si la croquette est aussi active (répartition par défaut,
 * ajustable ensuite créneau par créneau). Croquette : complète ce qu'il reste réellement du budget. */
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

	const quantitesParId = new Map<string, number>();
	for (const foodType of Object.keys(totauxParType) as RepartitionFoodType[]) {
		const slotsType = input.slots.filter((s) => s.foodType === foodType);
		if (slotsType.length === 0) continue;

		const { quantites, avertissement } = distribuerType(
			totauxParType[foodType],
			slotsType,
			LABELS_TYPE[foodType],
			uniteAlignementParType[foodType]
		);
		for (const [id, quantite] of quantites) quantitesParId.set(id, quantite);
		if (avertissement) avertissements.push(avertissement);
	}

	return {
		slots: input.slots.map((s) => ({ id: s.id, quantiteG: quantitesParId.get(s.id) ?? 0 })),
		nombrePaquetsPatee,
		totalCibleKcal: input.der,
		avertissements
	};
}
