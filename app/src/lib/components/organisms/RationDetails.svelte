<script lang="ts">
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Progress from '$lib/components/atoms/Progress.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Slider from '$lib/components/molecules/Slider.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Disclosure from '$lib/components/molecules/Disclosure.svelte';
	import {
		calculerRatioEcartSeuil,
		type NomNutrimentValide,
		type StatutNutriment,
		type SeuilNutriment
	} from '$lib/domain/nutrition.calc';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import type { RepartitionOkResponse } from './DailyMealSchedule.svelte';

	interface RationStatut {
		nutriment: NomNutrimentValide;
		valeur: number;
		statut: StatutNutriment;
		seuil: SeuilNutriment;
		positionPct: number;
	}

	let {
		repartition,
		catId,
		onchange
	}: {
		repartition: RepartitionOkResponse;
		catId: string;
		/** Appelé après tout PATCH réussi (slider pâtée) pour recharger la répartition à jour. */
		onchange: () => void | Promise<void>;
	} = $props();

	let pateePaquetsValue = $state(repartition.pateeNombrePaquetsOverride ?? repartition.nombrePaquetsPatee ?? 0.5);
	let pateePaquetsSaving = $state(false);
	let pateePaquetsError = $state<string | null>(null);

	/** Resynchronise le slider quand la répartition est rechargée depuis le serveur (après un PATCH,
	 * une réinitialisation de journée, ou un recalcul du DER) — ne dépend pas de `pateePaquetsValue`
	 * pour éviter de repartir en boucle pendant le glissement local du slider. */
	$effect(() => {
		pateePaquetsValue = repartition.pateeNombrePaquetsOverride ?? repartition.nombrePaquetsPatee ?? 0.5;
	});

	const packageSizePatee = $derived(
		repartition.repas.find((r) => r.foodType === 'patee')?.food.packageSizeG ?? null
	);

	/** Base stable pour le max du slider : dérivée des props (répartition serveur), jamais de
	 * `pateePaquetsValue` — sinon le max grandit à chaque `oninput` pendant le glissement (max = valeur
	 * courante × 2), ce qui fait s'emballer la valeur en boucle de rétroaction dès qu'on bouge le curseur. */
	const pateePaquetsBase = $derived(repartition.pateeNombrePaquetsOverride ?? repartition.nombrePaquetsPatee ?? 0.5);

	async function handlePateePaquetsCommit(newValue: number) {
		pateePaquetsValue = newValue;
		pateePaquetsSaving = true;
		pateePaquetsError = null;

		const response = await fetch(`/api/cats/${catId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pateeNombrePaquetsOverride: pateePaquetsValue })
		});

		pateePaquetsSaving = false;

		if (!response.ok) {
			pateePaquetsError = "Impossible d'enregistrer le nombre de paquets.";
			return;
		}

		await onchange();
	}

	async function handlePateePaquetsAuto() {
		pateePaquetsSaving = true;
		pateePaquetsError = null;

		const response = await fetch(`/api/cats/${catId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ pateeNombrePaquetsOverride: null })
		});

		pateePaquetsSaving = false;

		if (!response.ok) {
			pateePaquetsError = 'Impossible de repasser en calcul automatique.';
			return;
		}

		await onchange();
	}

	// Ratios (g/1000kcal ou %MS) inchangés quelle que soit la quantité donnée : seule la composition de
	// l'aliment (ou le mélange croquette/pâtée) peut corriger un déficit/excès, jamais la portion.
	const aUnRatioADeplacer = $derived(repartition.ration.statuts.some((s) => s.statut !== 'OK'));
	const glucidesEnAttention = $derived(
		repartition.ration.statuts.some((s) => s.nutriment === 'glucides' && s.statut === 'ATTENTION')
	);

	const nutrimentLabels: Record<NomNutrimentValide, string> = {
		proteines: 'Protéines',
		lipides: 'Lipides',
		calcium: 'Calcium',
		phosphore: 'Phosphore',
		taurine: 'Taurine',
		glucides: 'Glucides',
		ratioCalciumPhosphore: 'Ratio Ca:P'
	};

	const statutLabels: Record<StatutNutriment, string> = {
		OK: 'OK',
		DEFICIT: 'Déficit',
		EXCES: 'Excès',
		ATTENTION: 'À surveiller'
	};

	const statutBadgeVariant: Record<StatutNutriment, 'success' | 'danger' | 'warning'> = {
		OK: 'success',
		DEFICIT: 'danger',
		EXCES: 'warning',
		ATTENTION: 'warning'
	};

	const nutrimentUnite: Record<NomNutrimentValide, string> = {
		proteines: ' g/1000kcal',
		lipides: ' g/1000kcal',
		calcium: ' g/1000kcal',
		phosphore: ' g/1000kcal',
		taurine: ' g/1000kcal',
		glucides: ' % de matière sèche',
		ratioCalciumPhosphore: ''
	};

	function formatCible(nutriment: NomNutrimentValide, seuil: SeuilNutriment): string {
		const unite = nutrimentUnite[nutriment];
		if (seuil.min !== null && seuil.max !== null) return `cible ${seuil.min} – ${seuil.max}${unite}`;
		if (seuil.min !== null) return `cible ≥ ${seuil.min}${unite}`;
		if (seuil.max !== null) return `cible ≤ ${seuil.max}${unite}`;
		return 'pas de seuil strict';
	}

	/** Contextualise l'écart en clair : "2,4× la cible" (au-dessus d'un max) ou "à 86% du minimum". */
	function formatEcart(statut: RationStatut): string | null {
		const ratio = calculerRatioEcartSeuil(statut.valeur, statut.seuil);
		if (ratio === null) return null;
		if (statut.seuil.max !== null && statut.valeur > statut.seuil.max) {
			return `${ratio.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}× la cible`;
		}
		return `à ${Math.round(ratio * 100)}% du minimum`;
	}

	function formatValeursEstimees(aliment: { emEstimee: boolean; humiditeEstimee: boolean; glucidesEstimes: boolean }): string {
		const flags: string[] = [];
		if (aliment.emEstimee) flags.push('EM');
		if (aliment.humiditeEstimee) flags.push('humidité');
		if (aliment.glucidesEstimes) flags.push('glucides');
		return flags.join(', ');
	}

	/** Aliments actifs dont l'énergie (kcal/100g) est estimée (NRC 2006) plutôt que déclarée par le
	 * fabricant — contrairement à humidité/glucides estimés, ça affecte directement le nombre de grammes
	 * calculé ci-dessus (pas seulement les ratios protéines/lipides/etc.), donc ça mérite une note
	 * séparée et visible près du total, pas noyée avec les autres estimations. */
	const alimentsEmEstimee = $derived(
		repartition.ration.fiabiliteParAliment.filter((a) => a.emEstimee).map((a) => a.foodName)
	);
</script>

<Disclosure
	title="Le détail du calcul"
	subtitle={`${Math.round(repartition.ration.totalKcal)} kcal sur ${Math.round(repartition.der)} visés — les chiffres derrière le score.`}
>
	{#if repartition.ration.sousLeRER}
		<Alert variant="danger" title="Sous le RER">
			La ration du jour descend sous le RER de votre chat ({Math.round(repartition.rer)} kcal) —
			risque de lipidose hépatique en cas de restriction trop marquée. Un vétérinaire doit valider
			tout objectif de perte de poids agressif.
		</Alert>
	{/if}

	<div class="flex flex-col gap-2.5">
		{#each repartition.ration.statuts as statut (statut.nutriment)}
			{@const ecart = formatEcart(statut)}
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between text-sm">
					<span class="text-foreground">{nutrimentLabels[statut.nutriment]}</span>
					<Badge variant={statutBadgeVariant[statut.statut]}>
						{statutLabels[statut.statut]} ({statut.valeur.toFixed(1)}{ecart ? ` — ${ecart}` : ''})
					</Badge>
				</div>
				<Progress value={statut.positionPct} tone={statutBadgeVariant[statut.statut]} />
				<span class="text-xs text-muted-foreground">{formatCible(statut.nutriment, statut.seuil)}</span>
			</div>
		{/each}
	</div>

	{#if aUnRatioADeplacer}
		<Alert variant="warning" title="Baisser la ration ne corrige pas ces ratios">
			Ces valeurs sont calculées par rapport aux calories (ou à la matière sèche), pas au poids donné
			— la quantité totale est déjà ajustée pour couvrir le DER. Pour corriger un déficit ou un excès,
			il faut changer d'aliment, ou ajuster la répartition croquette / pâtée.
			{#if glucidesEnAttention && repartition.ration.glucidesParAliment.length > 0}
				<div class="mt-2 flex flex-col gap-1">
					<span class="font-medium">Répartition des glucides par aliment actif :</span>
					{#each repartition.ration.glucidesParAliment as aliment, i (aliment.foodId)}
						<span class="flex items-center justify-between">
							<span>{i === 0 ? '🔴' : '⚪'} {aliment.foodName}</span>
							<span>{aliment.pctMatiereSeche.toFixed(0)}% MS</span>
						</span>
					{/each}
				</div>
			{/if}
		</Alert>
	{/if}

	{#if alimentsEmEstimee.length > 0}
		<Alert variant="info" title="* Énergie calculée par l'app, pas lue sur l'étiquette">
			Le kcal/100g n'est pas obligatoire sur un emballage en UE : c'est normal de ne pas l'y trouver.
			Pour {alimentsEmEstimee.join(', ')}, l'app le calcule à partir de l'analyse nutritionnelle (elle,
			toujours imprimée) avec l'équation NRC 2006 — la méthode des guides FEDIAF et des calculateurs
			vétérinaires. C'est une estimation sérieuse, pas un bouche-trou, mais elle reste à quelques
			pourcents de la valeur réelle.
			<span class="mt-2 block">
				Comparez avec le tableau de rationnement du paquet : un écart de 10-15% est attendu, car ce
				tableau ne connaît ni la stérilisation ni le niveau d'activité de votre chat, contrairement à
				l'app. Si l'écart vous gêne, saisissez le kcal/100g du fabricant sur la fiche
				<a href="/aliments" class="underline">Aliments</a> quand vous l'avez.
			</span>
		</Alert>
	{/if}

	{#if repartition.ration.fiabiliteParAliment.length > 0}
		<Alert variant="warning" title="Valeurs partiellement estimées">
			Ces aliments actifs reposent sur au moins une valeur estimée plutôt que déclarée par le
			fabricant — les statuts ci-dessus en héritent.
			<div class="mt-2 flex flex-col gap-1">
				{#each repartition.ration.fiabiliteParAliment as aliment (aliment.foodId)}
					<span class="flex items-center justify-between">
						<span>{aliment.foodName}</span>
						<span class="text-xs text-muted-foreground">{formatValeursEstimees(aliment)}</span>
					</span>
				{/each}
			</div>
		</Alert>
	{/if}

	<p class="text-xs text-muted-foreground">
		Point de départ calculé, pas une prescription figée : vérifiez que ces quantités correspondent au
		dosage conseillé sur le paquet, suivez le poids réel de votre chat dans le temps, et consultez
		votre vétérinaire en cas de doute (convalescence, jeune chat, pathologie).
		<a href="/comprendre" class="underline">Tout comprendre du calcul</a>.
	</p>
</Disclosure>

{#if repartition.nombrePaquetsPatee !== null}
	<Disclosure
		title="Ajuster la pâtée"
		subtitle={`${repartition.nombrePaquetsPatee % 1 === 0 ? repartition.nombrePaquetsPatee : repartition.nombrePaquetsPatee.toFixed(1)} paquet${repartition.nombrePaquetsPatee > 1 ? 's' : ''} par jour${repartition.pateeNombrePaquetsOverride !== null ? ' — fixé par vous' : " — calculé par l'app"}`}
	>
		<p class="text-sm text-muted-foreground">
			Le nombre de paquets par jour est calculé pour coller au besoin de votre chat, puis réparti sur
			ses créneaux pâtée. Fixez-le vous-même seulement si votre vétérinaire ou le paquet vous indique
			une autre quantité.
		</p>

		<Slider
			min={0.5}
			max={Math.max(pateePaquetsBase * 2, 3)}
			step={0.5}
			disabled={pateePaquetsSaving}
			value={pateePaquetsValue}
			valueLabel={`${pateePaquetsValue % 1 === 0 ? pateePaquetsValue : pateePaquetsValue.toFixed(1)} paquet${pateePaquetsValue > 1 ? 's' : ''}${packageSizePatee ? ` (${pateePaquetsValue * packageSizePatee} g)` : ''}`}
			oninput={(v) => (pateePaquetsValue = v)}
			onchange={handlePateePaquetsCommit}
		/>

		{#if repartition.pateeNombrePaquetsOverride !== null}
			<Button variant="secondary" size="sm" class="w-fit" onclick={handlePateePaquetsAuto} disabled={pateePaquetsSaving}>
				<RotateCcw />
				Revenir au calcul automatique
			</Button>
		{/if}

		{#if pateePaquetsError}<Alert variant="danger">{pateePaquetsError}</Alert>{/if}
	</Disclosure>
{/if}
