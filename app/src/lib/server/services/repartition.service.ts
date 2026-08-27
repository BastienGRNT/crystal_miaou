import { findCatWithActiveFoodsById, isCatMemberForUser } from '$lib/server/repositories/cat.repository';
import { findActiveDailyPlanForCat } from '$lib/server/repositories/dailyPlan.repository';
import {
	createMealEntries,
	deleteMealEntriesForCatOnDate,
	listMealEntriesForCatOnDate,
	updateMealEntryQuantities
} from '$lib/server/repositories/mealEntry.repository';
import {
	agregerRation,
	calculerDER,
	calculerPctMatiereSeche,
	calculerRER,
	resoudreFacteurDER,
	validerRation,
	type StatusParNutriment
} from '$lib/domain/nutrition.calc';
import { calculerScoreRation, type ScoreRation } from '$lib/domain/score.calc';
import { detecterEmSuspecte } from '$lib/domain/food.calc';
import { deriveDERFactorProfileFromCat } from '$lib/domain/cat.calc';
import {
	calculerRepartitionJournaliere,
	type RepartitionFoodType,
	type SlotEtat
} from '$lib/domain/repartition.calc';

export interface GlucidesParAliment {
	foodId: string;
	foodName: string;
	pctMatiereSeche: number;
}

export interface FiabiliteAliment {
	foodId: string;
	foodName: string;
	emEstimee: boolean;
	humiditeEstimee: boolean;
	glucidesEstimes: boolean;
}

export interface RationResume {
	totalKcal: number;
	statuts: StatusParNutriment[];
	sousLeRER: boolean;
	/** Un des aliments actifs tire spécifiquement les glucides vers le haut ? Triée du plus au moins
	 * riche en glucides — permet de désigner l'aliment responsable plutôt que de demander à l'utilisateur
	 * de comparer lui-même (section 6.3 : indicateur qualité, sert à orienter le choix d'aliment). */
	glucidesParAliment: GlucidesParAliment[];
	/** Quels aliments actifs reposent sur au moins une valeur estimée (EM, humidité ou glucides) plutôt
	 * que déclarée par le fabricant — permet de lire "2,4× la cible" en sachant si ça repose sur des
	 * vraies valeurs ou sur une chaîne d'estimations empilées. Ne liste que les aliments concernés. */
	fiabiliteParAliment: FiabiliteAliment[];
	/** Note globale du menu du jour + conclusion + actions triées par impact : c'est ce que l'UI
	 * affiche en premier, le détail par nutriment n'étant qu'un repli pour qui veut vérifier. */
	score: ScoreRation;
}

/** Regroupe par aliment (dédupliqué) les drapeaux "estimé, pas déclaré par le fabricant" — ne renvoie
 * que les aliments ayant au moins une valeur estimée. */
export function calculerFiabiliteParAliment(
	entries: {
		food: {
			id: string;
			name: string;
			emEstimee: boolean;
			humiditeEstimee: boolean;
			glucidesEstimes: boolean;
			emKcal100g: unknown;
			proteinesG100g: unknown;
			lipidesG100g: unknown;
			humiditeG100g: unknown;
			fibresG100g: unknown;
			cendresG100g: unknown;
			glucidesG100g: unknown;
		};
	}[]
): FiabiliteAliment[] {
	const parAliment = new Map<string, FiabiliteAliment>();

	for (const entry of entries) {
		if (parAliment.has(entry.food.id)) continue;
		const { humiditeEstimee, glucidesEstimes } = entry.food;
		// emEstimee déclaré "false" n'est pas toujours fiable : une valeur recopiée depuis notre propre
		// suggestion de l'app (ex. duplication d'un aliment) est traitée comme incertaine malgré tout.
		const emEstimee =
			entry.food.emEstimee ||
			detecterEmSuspecte({
				emKcal100g: Number(entry.food.emKcal100g),
				emEstimee: entry.food.emEstimee,
				proteinesG100g: Number(entry.food.proteinesG100g),
				lipidesG100g: Number(entry.food.lipidesG100g),
				humiditeG100g: Number(entry.food.humiditeG100g),
				fibresG100g: Number(entry.food.fibresG100g),
				cendresG100g: Number(entry.food.cendresG100g),
				glucidesG100g: Number(entry.food.glucidesG100g)
			});
		if (!emEstimee && !humiditeEstimee && !glucidesEstimes) continue;
		parAliment.set(entry.food.id, {
			foodId: entry.food.id,
			foodName: entry.food.name,
			emEstimee,
			humiditeEstimee,
			glucidesEstimes
		});
	}

	return [...parAliment.values()];
}

/** Regroupe par aliment (dédupliqué) le %MS de glucides — propriété de l'aliment, indépendante de la
 * quantité donnée. Ne renvoie que les aliments dont les glucides sont connus. */
export function calculerGlucidesParAliment(
	entries: { food: { id: string; name: string; glucidesG100g: unknown; humiditeG100g: unknown } }[]
): GlucidesParAliment[] {
	const parAliment = new Map<string, GlucidesParAliment>();

	for (const entry of entries) {
		if (parAliment.has(entry.food.id) || entry.food.glucidesG100g === null) continue;
		parAliment.set(entry.food.id, {
			foodId: entry.food.id,
			foodName: entry.food.name,
			pctMatiereSeche: calculerPctMatiereSeche(Number(entry.food.glucidesG100g), Number(entry.food.humiditeG100g))
		});
	}

	return [...parAliment.values()].sort((a, b) => b.pctMatiereSeche - a.pctMatiereSeche);
}

export type DistributionMode = 'gamelle' | 'distributeur_automatique' | 'gamelle_ludique';

export interface RepasRepartition {
	id: string;
	consumedAt: string;
	foodType: RepartitionFoodType;
	food: { id: string; name: string; brand: string; packageSizeG: number | null; doseDistributeurG: number | null };
	quantiteG: number;
	/** Kcal apportées par ce créneau (quantiteG × emKcal100g du repas) — permet à l'UI d'afficher le
	 * poids calorique de chaque créneau sans redupliquer la formule côté client. */
	kcal: number;
	locked: boolean;
	validated: boolean;
	validatedBy: { id: string; name: string } | null;
	validatedAt: string | null;
	/** Mode de distribution du créneau source (routine) — permet à l'UI de différencier "donné par le
	 * distributeur automatique" (coché d'office) de "donné à la main" (coché par un membre du foyer). */
	distributionMode: DistributionMode;
	/** Nombre de doses du distributeur automatique que représente `quantiteG` — déjà calculé ici pour que
	 * web et mobile affichent la même valeur sans refaire la division chacun de leur côté. Null si ce
	 * créneau n'est pas distribué par un distributeur automatique à dose connue. */
	doses: number | null;
	/** Nombre de paquets de pâtée que représente `quantiteG` — même logique que `doses` ci-dessus mais
	 * pour la pâtée (CLAUDE.md règle 9 : "compter des doses" est nommé comme exemple canonique de calcul
	 * interdit côté client, le comptage de paquets en est l'exact analogue). Null hors pâtée. */
	paquets: number | null;
}

/** Récapitulatif des grammes de croquette du jour par "qui s'en charge" : le distributeur automatique
 * est déjà chargé pour tout le mois (rien à préparer), une gamelle (ludique ou non) demande de peser la
 * portion du jour à la main — deux gestes différents. Calculé une seule fois ici pour que web et mobile
 * affichent le même total sans ré-agréger `repas` chacun de leur côté (cf. specs/nutrition-spec.md
 * "API-first, une seule source de vérité"). Null si aucune croquette n'est active aujourd'hui. */
export interface RecapDistributionCroquette {
	distributeurAutomatiqueG: number;
	aPreparerG: number;
}

export interface RepartitionResultatOk {
	success: true;
	rer: number;
	der: number;
	facteurDER: number;
	nombrePaquetsPatee: number | null;
	/** Nombre de paquets/jour fixé explicitement par l'utilisateur, ou null si calculé automatiquement
	 * depuis le DER. Permet à l'UI de pré-remplir le slider et distinguer "auto" de "fixé". */
	pateeNombrePaquetsOverride: number | null;
	repas: RepasRepartition[];
	recapCroquette: RecapDistributionCroquette | null;
	/** Total de grammes du jour par type d'aliment — déjà agrégé ici pour que web et mobile affichent le
	 * même total sans ré-additionner `repas` chacun de leur côté (CLAUDE.md règle 9). */
	totauxParType: Record<RepartitionFoodType, number>;
	ration: RationResume;
	avertissements: string[];
}

export interface RepartitionResultatErreur {
	success: false;
	error: string;
}

/** Réinitialise complètement la journée : supprime tous les repas déjà générés pour ce chat à cette
 * date — y compris ceux verrouillés ou marqués "donné" — puis régénère et recalcule tout depuis la
 * routine active. À utiliser quand le foyer veut repartir d'une page blanche (ex: la journée a été
 * cochée par erreur, ou avec des quantités devenues obsolètes après un changement d'aliment actif). */
export async function reinitialiserRepartitionJournaliere(
	catId: string,
	date: string,
	userId: string
): Promise<RepartitionResultatOk | RepartitionResultatErreur> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, error: 'Chat introuvable.' };
	}

	await deleteMealEntriesForCatOnDate(catId, new Date(date));

	return calculerEtPersisterRepartitionJournaliere(catId, date, userId);
}

/** Régénère (si besoin) puis recalcule et persiste la répartition du jour pour ce chat : les créneaux
 * non verrouillés (ni ajustés manuellement, ni déjà "donnés") reçoivent la quantité recalculée par le
 * moteur de répartition, directement enregistrée en base — visible immédiatement par tout le foyer. */
export async function calculerEtPersisterRepartitionJournaliere(
	catId: string,
	date: string,
	userId: string
): Promise<RepartitionResultatOk | RepartitionResultatErreur> {
	const isMember = await isCatMemberForUser(catId, userId);
	if (!isMember) {
		return { success: false, error: 'Chat introuvable.' };
	}

	const cat = await findCatWithActiveFoodsById(catId);
	if (!cat) {
		return { success: false, error: 'Chat introuvable.' };
	}

	if (!cat.activeCroquetteFood && !cat.activePateeFood) {
		return {
			success: false,
			error: 'Choisissez au moins un aliment actif (pâtée ou croquette) pour ce chat.'
		};
	}

	if (cat.activeCroquetteFood && cat.activeCroquetteFood.emKcal100g === null) {
		return { success: false, error: `Les valeurs nutritionnelles de "${cat.activeCroquetteFood.name}" sont incomplètes.` };
	}
	if (cat.activePateeFood && (cat.activePateeFood.emKcal100g === null || cat.activePateeFood.packageSizeG === null)) {
		return {
			success: false,
			error: `Les valeurs nutritionnelles ou le poids du paquet de "${cat.activePateeFood.name}" sont incomplets.`
		};
	}
	if (cat.activeFriandiseFood && (cat.activeFriandiseFood.emKcal100g === null || cat.friandiseQuantiteTotaleG === null)) {
		return {
			success: false,
			error: `Renseignez la quantité de friandise donnée par jour pour "${cat.activeFriandiseFood.name}".`
		};
	}

	const activePlan = await findActiveDailyPlanForCat(catId);
	if (!activePlan || activePlan.slots.length === 0) {
		return { success: false, error: "Configurez d'abord une routine (rythme des repas) pour ce chat." };
	}

	const targetDate = new Date(date);
	let mealEntries = await listMealEntriesForCatOnDate(catId, targetDate);
	/** Créneaux distributeur automatique générés à l'instant : coché "donné" d'office (quantiteActuelleG
	 * à 0, aucune quantité réelle encore), donc traités comme non verrouillés pour CE calcul uniquement —
	 * sinon ils recevraient 0g pour toujours au lieu de la quantité calculée. */
	let freshlyGeneratedValidatedIds = new Set<string>();

	if (mealEntries.length === 0) {
		const foodParType: Record<RepartitionFoodType, { id: string } | null> = {
			croquette: cat.activeCroquetteFood,
			patee: cat.activePateeFood,
			friandise: cat.activeFriandiseFood
		};

		const slotSansAliment = activePlan.slots.find((slot) => !foodParType[slot.foodType]);
		if (slotSansAliment) {
			return {
				success: false,
				error: `La routine prévoit un créneau ${slotSansAliment.foodType} à ${slotSansAliment.timeOfDay} mais aucun aliment n'est actif pour ce type.`
			};
		}

		const entriesToCreate = activePlan.slots.map((slot) => {
			const [hours, minutes] = slot.timeOfDay.split(':').map(Number);
			const consumedAt = new Date(targetDate);
			consumedAt.setHours(hours, minutes, 0, 0);

			return {
				catId,
				foodId: foodParType[slot.foodType]!.id,
				quantityG: 0,
				consumedAt,
				recordedByUserId: userId,
				sourceDailyPlanSlotId: slot.id,
				// Un distributeur automatique donne le repas tout seul à l'heure prévue : le créneau est
				// coché "donné" d'office, il suffit de décocher si ça n'a pas fonctionné (specs foyer).
				validated: slot.distributionMode === 'distributeur_automatique'
			};
		});

		const created = await createMealEntries(entriesToCreate);
		freshlyGeneratedValidatedIds = new Set(created.filter((entry) => entry.validated).map((entry) => entry.id));
		mealEntries = await listMealEntriesForCatOnDate(catId, targetDate);
	}

	const rer = calculerRER(Number(cat.weightKg));
	const facteurDER = resoudreFacteurDER(deriveDERFactorProfileFromCat(cat, new Date()));
	const der = calculerDER(rer, facteurDER, Number(cat.derAjustementPct));

	const slots: SlotEtat[] = mealEntries.map((entry) => ({
		id: entry.id,
		foodType: entry.food.type as RepartitionFoodType,
		locked: (entry.locked || entry.validated) && !freshlyGeneratedValidatedIds.has(entry.id),
		quantiteActuelleG: Number(entry.quantityG ?? 0),
		heureMinutes: entry.consumedAt.getHours() * 60 + entry.consumedAt.getMinutes(),
		doseDistributeurG:
			entry.food.type === 'croquette' &&
			entry.sourceDailyPlanSlot?.distributionMode === 'distributeur_automatique' &&
			entry.food.doseDistributeurG !== null
				? Number(entry.food.doseDistributeurG)
				: undefined
	}));

	const resultat = calculerRepartitionJournaliere({
		der,
		croquette: cat.activeCroquetteFood ? { kcal100g: Number(cat.activeCroquetteFood.emKcal100g) } : null,
		patee: cat.activePateeFood
			? {
					kcal100g: Number(cat.activePateeFood.emKcal100g),
					packageSizeG: Number(cat.activePateeFood.packageSizeG),
					nombrePaquetsOverride:
						cat.pateeNombrePaquetsOverride === null ? null : Number(cat.pateeNombrePaquetsOverride)
				}
			: null,
		friandise: cat.activeFriandiseFood
			? { kcal100g: Number(cat.activeFriandiseFood.emKcal100g), quantiteTotaleG: Number(cat.friandiseQuantiteTotaleG) }
			: null,
		slots
	});

	const quantiteParId = new Map(resultat.slots.map((s) => [s.id, s.quantiteG]));

	const aPersister = mealEntries
		.filter((entry) => !(entry.locked || entry.validated) || freshlyGeneratedValidatedIds.has(entry.id))
		.map((entry) => ({ id: entry.id, quantityG: quantiteParId.get(entry.id) ?? 0 }));
	await updateMealEntryQuantities(aPersister);

	const repas: RepasRepartition[] = mealEntries.map((entry) => {
		const quantiteG = quantiteParId.get(entry.id) ?? 0;
		const packageSizeG = entry.food.packageSizeG === null ? null : Number(entry.food.packageSizeG);
		const doseDistributeurG =
			entry.food.doseDistributeurG === null ? null : Number(entry.food.doseDistributeurG);
		const distributionMode = (entry.sourceDailyPlanSlot?.distributionMode ?? 'gamelle') as DistributionMode;
		const foodType = entry.food.type as RepartitionFoodType;

		return {
			id: entry.id,
			consumedAt: entry.consumedAt.toISOString(),
			foodType,
			food: {
				id: entry.food.id,
				name: entry.food.name,
				brand: entry.food.brand,
				packageSizeG,
				doseDistributeurG
			},
			quantiteG,
			kcal: Math.round((quantiteG * Number(entry.food.emKcal100g)) / 100),
			locked: entry.locked,
			validated: entry.validated,
			validatedBy: entry.validatedBy ? { id: entry.validatedBy.id, name: entry.validatedBy.name } : null,
			validatedAt: entry.validatedAt ? entry.validatedAt.toISOString() : null,
			distributionMode,
			doses:
				distributionMode === 'distributeur_automatique' && doseDistributeurG
					? Math.round(quantiteG / doseDistributeurG)
					: null,
			paquets: foodType === 'patee' && packageSizeG ? quantiteG / packageSizeG : null
		};
	});

	const totauxParType: Record<RepartitionFoodType, number> = { croquette: 0, patee: 0, friandise: 0 };
	for (const r of repas) {
		totauxParType[r.foodType] += r.quantiteG;
	}

	const recapCroquette: RecapDistributionCroquette | null = cat.activeCroquetteFood
		? repas
				.filter((r) => r.foodType === 'croquette')
				.reduce<RecapDistributionCroquette>(
					(acc, r) => {
						if (r.distributionMode === 'distributeur_automatique') acc.distributeurAutomatiqueG += r.quantiteG;
						else acc.aPreparerG += r.quantiteG;
						return acc;
					},
					{ distributeurAutomatiqueG: 0, aPreparerG: 0 }
				)
		: null;

	const rationCalculee = agregerRation(
		mealEntries.map((entry) => ({
			quantiteG: quantiteParId.get(entry.id) ?? 0,
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

	const glucidesParAliment = calculerGlucidesParAliment(mealEntries);
	const fiabiliteParAliment = calculerFiabiliteParAliment(mealEntries);

	const ration: RationResume = {
		totalKcal: rationCalculee.totalKcal,
		statuts,
		sousLeRER: rationCalculee.totalKcal < rer,
		glucidesParAliment,
		fiabiliteParAliment,
		score: calculerScoreRation({
			totalKcal: rationCalculee.totalKcal,
			der,
			rer,
			statuts,
			fiabiliteParAliment,
			glucidesParAliment,
			nombreAlimentsActifs: new Set(mealEntries.map((entry) => entry.food.id)).size
		})
	};

	return {
		success: true,
		rer,
		der,
		facteurDER,
		nombrePaquetsPatee: resultat.nombrePaquetsPatee,
		pateeNombrePaquetsOverride:
			cat.pateeNombrePaquetsOverride === null ? null : Number(cat.pateeNombrePaquetsOverride),
		repas,
		recapCroquette,
		totauxParType,
		ration,
		avertissements: resultat.avertissements
	};
}
