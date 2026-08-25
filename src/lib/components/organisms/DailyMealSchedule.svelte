<script lang="ts">
	import Card from '$lib/components/atoms/Card.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Checkbox from '$lib/components/atoms/Checkbox.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Progress from '$lib/components/atoms/Progress.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import Slider from '$lib/components/molecules/Slider.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import RationScoreCard from '$lib/components/organisms/RationScoreCard.svelte';
	import RationSummaryCard from '$lib/components/organisms/RationSummaryCard.svelte';
	import type { NomNutrimentValide, StatutNutriment, SeuilNutriment } from '$lib/domain/nutrition.calc';
	import type { ScoreRation } from '$lib/domain/score.calc';
	import Beef from '@lucide/svelte/icons/beef';
	import Drumstick from '@lucide/svelte/icons/drumstick';
	import Fish from '@lucide/svelte/icons/fish';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Check from '@lucide/svelte/icons/check';

	type FoodType = 'croquette' | 'patee' | 'friandise';

	interface RationStatut {
		nutriment: NomNutrimentValide;
		valeur: number;
		statut: StatutNutriment;
		seuil: SeuilNutriment;
		positionPct: number;
	}

	type DistributionMode = 'gamelle' | 'distributeur_automatique' | 'gamelle_ludique';

	export interface RepasRepartition {
		id: string;
		consumedAt: string;
		foodType: FoodType;
		food: { id: string; name: string; brand: string; packageSizeG: number | null };
		quantiteG: number;
		locked: boolean;
		validated: boolean;
		validatedBy: { id: string; name: string } | null;
		validatedAt: string | null;
		distributionMode: DistributionMode;
	}

	export interface RepartitionOkResponse {
		success: true;
		rer: number;
		der: number;
		facteurDER: number;
		nombrePaquetsPatee: number | null;
		pateeNombrePaquetsOverride: number | null;
		repas: RepasRepartition[];
		ration: {
			totalKcal: number;
			statuts: RationStatut[];
			sousLeRER: boolean;
			glucidesParAliment: { foodId: string; foodName: string; pctMatiereSeche: number }[];
			fiabiliteParAliment: {
				foodId: string;
				foodName: string;
				emEstimee: boolean;
				humiditeEstimee: boolean;
				glucidesEstimes: boolean;
			}[];
			score: ScoreRation;
		};
		avertissements: string[];
	}

	let {
		repartition,
		catId,
		catName,
		date,
		onchange
	}: {
		repartition: RepartitionOkResponse;
		catId: string;
		catName: string;
		date: string;
		/** Appelé après tout PATCH/POST réussi (slider, coche, réinitialisation) pour recharger la répartition à jour. */
		onchange: () => void | Promise<void>;
	} = $props();

	let resetting = $state(false);
	let resetError = $state<string | null>(null);

	async function handleResetJournee() {
		if (
			!confirm(
				"Réinitialiser la journée ? Tous les repas déjà cochés « donné » ou ajustés seront effacés et recalculés depuis la routine."
			)
		) {
			return;
		}

		resetting = true;
		resetError = null;

		const response = await fetch('/api/repartition', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ catId, date })
		});

		resetting = false;

		if (!response.ok) {
			resetError = 'Impossible de réinitialiser la journée.';
			return;
		}

		await onchange();
	}

	const foodTypeIcon: Record<FoodType, typeof Beef> = {
		croquette: Drumstick,
		patee: Beef,
		friandise: Fish
	};

	/** Libellé de la coche "donné" adapté au mode de distribution : le distributeur automatique donne
	 * sans intervention (coché d'office, on ne décoche que si ça n'a pas marché), la gamelle nécessite
	 * une action manuelle. */
	function labelDonne(repas: RepasRepartition): string {
		return repas.distributionMode === 'distributeur_automatique' ? 'Donné (auto)' : 'Donné à la main';
	}

	let sliderValues = $state<Record<string, number>>({});
	let pendingId = $state<string | null>(null);
	let actionError = $state<string | null>(null);
	/** Le slider d'un créneau reste caché derrière "Ajuster" : au quotidien on sert la quantité
	 * calculée et on coche, le réglage fin est l'exception. */
	let ajustementOuvert = $state<Record<string, boolean>>({});

	function sliderValue(repas: RepasRepartition): number {
		return sliderValues[repas.id] ?? repas.quantiteG;
	}

	/** Pas du slider : pour la pâtée, toujours un demi-paquet (jamais un quart ou un tiers de paquet,
	 * ça ne se mesure pas sur une balance de cuisine) — pour les autres types, le gramme. */
	function sliderStep(repas: RepasRepartition): number {
		return repas.foodType === 'patee' && repas.food.packageSizeG ? repas.food.packageSizeG / 2 : 0.5;
	}

	function formatQuantite(repas: RepasRepartition): string {
		if (repas.foodType === 'patee' && repas.food.packageSizeG) {
			const paquets = sliderValue(repas) / repas.food.packageSizeG;
			return `${paquets % 1 === 0 ? paquets : paquets.toFixed(1)} paquet${paquets > 1 ? 's' : ''}`;
		}
		return `${sliderValue(repas)} g`;
	}

	function formatHeure(consumedAt: string): string {
		return new Date(consumedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	function formatHoraireCoche(validatedAt: string): string {
		return new Date(validatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	async function patchEntry(id: string, body: Record<string, unknown>): Promise<boolean> {
		pendingId = id;
		actionError = null;

		const response = await fetch(`/api/meal-entries/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		pendingId = null;

		if (!response.ok) {
			actionError = "Impossible d'enregistrer ce changement.";
			return false;
		}

		return true;
	}

	function handleSliderInput(repas: RepasRepartition, value: number) {
		sliderValues[repas.id] = value;
	}

	async function handleSliderCommit(repas: RepasRepartition, value: number) {
		sliderValues[repas.id] = value;

		const ok = await patchEntry(repas.id, { quantityG: value });
		if (ok) await onchange();
	}

	async function handleToggleValidated(repas: RepasRepartition, nouvelleValeur: boolean) {
		const body: { validated: boolean; quantityG?: number } = { validated: nouvelleValeur };
		if (nouvelleValeur) body.quantityG = sliderValue(repas);

		const ok = await patchEntry(repas.id, body);
		if (ok) {
			delete sliderValues[repas.id];
			delete ajustementOuvert[repas.id];
			await onchange();
		}
	}

	const repasDonnes = $derived(repartition.repas.filter((r) => r.validated).length);
	const avancementPct = $derived(
		repartition.repas.length > 0 ? Math.round((repasDonnes / repartition.repas.length) * 100) : 0
	);
	/** Prochain repas non coché de la journée : c'est la seule ligne qui intéresse vraiment
	 * l'utilisateur quand il ouvre l'app en cuisine. */
	const prochainRepas = $derived(repartition.repas.find((r) => !r.validated) ?? null);
</script>

<RationScoreCard score={repartition.ration.score} {catName} />

{#each repartition.avertissements as avertissement}
	<Alert variant="warning">{avertissement}</Alert>
{/each}

<RationSummaryCard {repartition} />

<Card>
	{#snippet header()}
		<div class="flex flex-col gap-0.5">
			<h3 class="text-[17px] leading-tight">Repas du jour</h3>
			<p class="text-xs text-muted-foreground">
				{#if repartition.repas.length === 0}
					Aucun créneau prévu aujourd'hui.
				{:else if repasDonnes === repartition.repas.length}
					Tous les repas ont été donnés. 🎉
				{:else if prochainRepas}
					Prochain : {formatHeure(prochainRepas.consumedAt)} — {formatQuantite(prochainRepas)} de {prochainRepas.food.name}
				{/if}
			</p>
		</div>
		<Badge variant={repasDonnes === repartition.repas.length ? 'success' : 'default'}>
			{repasDonnes} / {repartition.repas.length} donnés
		</Badge>
	{/snippet}

	<Progress value={avancementPct} tone={repasDonnes === repartition.repas.length ? 'success' : 'primary'} />

	{#if resetError}<Alert variant="danger">{resetError}</Alert>{/if}

	<div class="flex flex-col gap-2">
		{#each repartition.repas as repas (repas.id)}
			{@const Icon = foodTypeIcon[repas.foodType]}
			<div
				class="flex flex-col gap-2 rounded-lg border px-3.5 py-3 transition-colors {repas.validated
					? 'border-success/30 bg-success-muted/40'
					: 'border-border bg-muted/30'}"
			>
				<div class="flex items-center gap-3">
					<span
						class="flex size-9 shrink-0 items-center justify-center rounded-lg {repas.validated
							? 'bg-success text-background'
							: 'bg-muted text-muted-foreground'}"
					>
						{#if repas.validated}<Check class="size-4.5" />{:else}<Icon class="size-4.5" />{/if}
					</span>

					<div class="flex min-w-0 flex-1 flex-col">
						<span class="flex items-baseline gap-2">
							<span class="font-heading text-sm font-semibold text-foreground">{formatHeure(repas.consumedAt)}</span>
							<span class="font-heading text-sm font-bold text-primary">{formatQuantite(repas)}</span>
						</span>
						<span class="truncate text-xs text-muted-foreground">{repas.food.name} ({repas.food.brand})</span>
					</div>

					<Checkbox
						checked={repas.validated}
						disabled={pendingId === repas.id}
						onchange={(e) => handleToggleValidated(repas, (e.target as HTMLInputElement).checked)}
					>
						{pendingId === repas.id ? '…' : labelDonne(repas)}
					</Checkbox>
				</div>

				<div class="flex items-center justify-between gap-2">
					{#if repas.validated && repas.validatedBy && repas.validatedAt}
						<span class="text-xs text-muted-foreground">
							coché par {repas.validatedBy.name} à {formatHoraireCoche(repas.validatedAt)}
						</span>
					{:else if repas.validated}
						<span class="text-xs text-muted-foreground">Distribué automatiquement — décochez si ce n'est pas le cas</span>
					{:else}
						<span class="text-xs text-muted-foreground">
							{repas.locked ? 'Quantité fixée à la main' : "Quantité calculée par l'app"}
						</span>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => (ajustementOuvert[repas.id] = !ajustementOuvert[repas.id])}
						>
							<SlidersHorizontal />
							{ajustementOuvert[repas.id] ? 'Fermer' : 'Ajuster'}
						</Button>
					{/if}
				</div>

				{#if ajustementOuvert[repas.id] && !repas.validated}
					<Slider
						valueLabel={formatQuantite(repas)}
						min={0}
						max={Math.max(repas.quantiteG * 2, 50)}
						step={sliderStep(repas)}
						value={sliderValue(repas)}
						oninput={(v) => handleSliderInput(repas, v)}
						onchange={(v) => handleSliderCommit(repas, v)}
					/>
					<p class="text-xs text-muted-foreground">
						Ce créneau ne sera plus recalculé automatiquement tant que vous n'aurez pas réinitialisé la
						journée.
					</p>
				{/if}
			</div>
		{/each}
	</div>

	{#if actionError}<Alert variant="danger">{actionError}</Alert>{/if}

	<Button variant="ghost" size="sm" class="w-fit" onclick={handleResetJournee} disabled={resetting}>
		{#if resetting}<Spinner />{:else}<RotateCcw />{/if}
		Repartir du calcul automatique
	</Button>
</Card>
