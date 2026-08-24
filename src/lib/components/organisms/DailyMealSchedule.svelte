<script lang="ts">
	import Card from '$lib/components/atoms/Card.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Checkbox from '$lib/components/atoms/Checkbox.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Progress from '$lib/components/atoms/Progress.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import Slider from '$lib/components/molecules/Slider.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Disclosure from '$lib/components/molecules/Disclosure.svelte';
	import RationScoreCard from '$lib/components/organisms/RationScoreCard.svelte';
	import {
		calculerRatioEcartSeuil,
		type NomNutrimentValide,
		type StatutNutriment,
		type SeuilNutriment
	} from '$lib/domain/nutrition.calc';
	import type { ScoreRation } from '$lib/domain/score.calc';
	import Beef from '@lucide/svelte/icons/beef';
	import Drumstick from '@lucide/svelte/icons/drumstick';
	import Fish from '@lucide/svelte/icons/fish';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Flame from '@lucide/svelte/icons/flame';
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

	const totauxParType = $derived.by(() => {
		const totaux: Record<FoodType, number> = { croquette: 0, patee: 0, friandise: 0 };
		for (const repas of repartition.repas) {
			totaux[repas.foodType] += repas.quantiteG;
		}
		return totaux;
	});

	// Ratios (g/1000kcal ou %MS) inchangés quelle que soit la quantité donnée : seule la composition de
	// l'aliment (ou le mélange croquette/pâtée) peut corriger un déficit/excès, jamais la portion.
	const aUnRatioADeplacer = $derived(repartition.ration.statuts.some((s) => s.statut !== 'OK'));
	const glucidesEnAttention = $derived(
		repartition.ration.statuts.some((s) => s.nutriment === 'glucides' && s.statut === 'ATTENTION')
	);

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
	const foodIdsEmEstimee = $derived(
		new Set(repartition.ration.fiabiliteParAliment.filter((a) => a.emEstimee).map((a) => a.foodId))
	);

	function typeReposeSurEmEstimee(type: FoodType): boolean {
		return repartition.repas.some((r) => r.foodType === type && foodIdsEmEstimee.has(r.food.id));
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
			return `${paquets % 1 === 0 ? paquets : paquets.toFixed(1)} paquet${paquets > 1 ? 's' : ''} (${sliderValue(repas)} g)`;
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

	const progressionPct = $derived(
		repartition.der > 0 ? Math.min(100, Math.round((repartition.ration.totalKcal / repartition.der) * 100)) : 0
	);

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
						{pendingId === repas.id ? '…' : 'Donné'}
					</Checkbox>
				</div>

				<div class="flex items-center justify-between gap-2">
					{#if repas.validated && repas.validatedBy && repas.validatedAt}
						<span class="text-xs text-muted-foreground">
							coché par {repas.validatedBy.name} à {formatHoraireCoche(repas.validatedAt)}
						</span>
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
						max={Math.max(sliderValue(repas) * 2, 50)}
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

<Disclosure
	title="Le détail du calcul"
	subtitle={`${Math.round(repartition.ration.totalKcal)} kcal sur ${Math.round(repartition.der)} visés — les chiffres derrière le score.`}
>
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2">
			<span class="flex size-8 items-center justify-center rounded-lg bg-primary-muted text-primary">
				<Flame class="size-4" />
			</span>
			<p class="text-sm text-foreground">
				<strong class="font-heading">{Math.round(repartition.ration.totalKcal)}</strong> / {Math.round(repartition.der)} kcal
				<span class="text-muted-foreground">
					({progressionPct}%) — RER {Math.round(repartition.rer)} kcal, facteur {repartition.facteurDER}
				</span>
			</p>
		</div>
		<Progress value={progressionPct} />
	</div>

	<p class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
		Total du jour :
		{#if totauxParType.croquette > 0}
			<span class="inline-flex items-center gap-1">
				<Drumstick class="size-3.5" />
				{Math.round(totauxParType.croquette)} g{typeReposeSurEmEstimee('croquette') ? '*' : ''}
			</span>
		{/if}
		{#if totauxParType.patee > 0}
			<span class="inline-flex items-center gap-1">
				<Beef class="size-3.5" />
				{Math.round(totauxParType.patee)} g{typeReposeSurEmEstimee('patee') ? '*' : ''}
			</span>
		{/if}
		{#if totauxParType.friandise > 0}
			<span class="inline-flex items-center gap-1">
				<Fish class="size-3.5" />
				{Math.round(totauxParType.friandise)} g{typeReposeSurEmEstimee('friandise') ? '*' : ''}
			</span>
		{/if}
	</p>

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
			max={Math.max(pateePaquetsValue * 2, 3)}
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
