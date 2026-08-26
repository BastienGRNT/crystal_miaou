<script lang="ts">
	import Card from '$lib/components/atoms/Card.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Progress from '$lib/components/atoms/Progress.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import EmptyState from '$lib/components/molecules/EmptyState.svelte';
	import {
		calculerRatioEcartSeuil,
		type NomNutrimentValide,
		type StatutNutriment,
		type SeuilNutriment
	} from '$lib/domain/nutrition.calc';
	import Beef from '@lucide/svelte/icons/beef';
	import Drumstick from '@lucide/svelte/icons/drumstick';
	import Fish from '@lucide/svelte/icons/fish';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import Flame from '@lucide/svelte/icons/flame';

	type FoodType = 'croquette' | 'patee' | 'friandise';

	interface DailyLogEntry {
		id: string;
		consumedAt: string;
		foodType: FoodType;
		food: { id: string; name: string; brand: string; packageSizeG: number | null };
		quantiteG: number;
		validated: boolean;
		validatedBy: { id: string; name: string } | null;
		validatedAt: string | null;
	}

	export interface DailyLogOkResponse {
		success: true;
		date: string;
		rer: number;
		der: number;
		entries: DailyLogEntry[];
		ration: {
			totalKcal: number;
			statuts: {
				nutriment: NomNutrimentValide;
				valeur: number;
				statut: StatutNutriment;
				seuil: SeuilNutriment;
				positionPct: number;
			}[];
			sousLeRER: boolean;
			glucidesParAliment: { foodId: string; foodName: string; pctMatiereSeche: number }[];
			fiabiliteParAliment: {
				foodId: string;
				foodName: string;
				emEstimee: boolean;
				humiditeEstimee: boolean;
				glucidesEstimes: boolean;
			}[];
		};
	}

	let { log }: { log: DailyLogOkResponse } = $props();

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
	function formatEcart(statut: { valeur: number; seuil: SeuilNutriment }): string | null {
		const ratio = calculerRatioEcartSeuil(statut.valeur, statut.seuil);
		if (ratio === null) return null;
		if (statut.seuil.max !== null && statut.valeur > statut.seuil.max) {
			return `${ratio.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}× la cible`;
		}
		return `à ${Math.round(ratio * 100)}% du minimum`;
	}

	function formatHeure(consumedAt: string): string {
		return new Date(consumedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	function formatValeursEstimees(aliment: { emEstimee: boolean; humiditeEstimee: boolean; glucidesEstimes: boolean }): string {
		const flags: string[] = [];
		if (aliment.emEstimee) flags.push('EM');
		if (aliment.humiditeEstimee) flags.push('humidité');
		if (aliment.glucidesEstimes) flags.push('glucides');
		return flags.join(', ');
	}

	function formatQuantite(entry: DailyLogEntry): string {
		if (entry.foodType === 'patee' && entry.food.packageSizeG) {
			const paquets = entry.quantiteG / entry.food.packageSizeG;
			return `${paquets % 1 === 0 ? paquets : paquets.toFixed(1)} paquet${paquets > 1 ? 's' : ''} (${entry.quantiteG} g)`;
		}
		return `${entry.quantiteG} g`;
	}

	const progressionPct = $derived(
		log.der > 0 ? Math.min(100, Math.round((log.ration.totalKcal / log.der) * 100)) : 0
	);

	// Ratios (g/1000kcal ou %MS) inchangés quelle que soit la quantité donnée : seule la composition de
	// l'aliment (ou le mélange croquette/pâtée) peut corriger un déficit/excès, jamais la portion.
	const aUnRatioADeplacer = $derived(log.ration.statuts.some((s) => s.statut !== 'OK'));
	const glucidesEnAttention = $derived(
		log.ration.statuts.some((s) => s.nutriment === 'glucides' && s.statut === 'ATTENTION')
	);
</script>

{#if log.entries.length === 0}
	<EmptyState icon={CalendarX} title="Aucun repas ce jour-là" description="Rien n'a été enregistré pour cette journée." />
{:else}
	<Card>
		{#snippet header()}
			<h3 class="text-[17px] leading-tight">Repas donnés ce jour-là</h3>
		{/snippet}

		<div class="flex flex-col gap-3">
			{#each log.entries as entry (entry.id)}
				{@const Icon = foodTypeIcon[entry.foodType]}
				<div class="flex items-center justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
					<span class="flex items-center gap-2 text-sm font-medium text-foreground">
						<span class="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
							<Icon class="size-3.5" />
						</span>
						{formatHeure(entry.consumedAt)} — {entry.food.name} ({entry.food.brand})
					</span>
					<div class="flex items-center gap-2">
						<Badge variant="outline">{formatQuantite(entry)}</Badge>
						{#if entry.validated}
							<Badge variant="success">Donné</Badge>
						{:else}
							<Badge variant="warning">Non donné</Badge>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</Card>

	<Card>
		{#snippet header()}
			<div class="flex items-center gap-2.5">
				<span class="flex size-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
					<Flame class="size-4.5" />
				</span>
				<h3 class="text-[17px] leading-tight">Résumé du jour</h3>
			</div>
		{/snippet}

		<div class="flex flex-col gap-2">
			<Progress value={progressionPct} />
			<p class="text-sm text-foreground">
				<strong class="font-heading">{Math.round(log.ration.totalKcal)}</strong> / {Math.round(log.der)} kcal
				<span class="text-muted-foreground">({progressionPct}%) — RER {Math.round(log.rer)} kcal</span>
			</p>
		</div>

		{#if log.ration.sousLeRER}
			<Alert variant="danger">Ce jour-là, la ration est descendue sous le RER de votre chat.</Alert>
		{/if}

		<div class="flex flex-col gap-2.5">
			{#each log.ration.statuts as statut (statut.nutriment)}
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

		{#if log.ration.fiabiliteParAliment.length > 0}
			<Alert variant="warning" title="Valeurs partiellement estimées">
				Ces aliments reposaient sur au moins une valeur estimée plutôt que déclarée par le
				fabricant — les écarts calculés ci-dessus en héritent.
				<div class="mt-2 flex flex-col gap-1">
					{#each log.ration.fiabiliteParAliment as aliment (aliment.foodId)}
						<span class="flex items-center justify-between">
							<span>{aliment.foodName}</span>
							<span class="text-xs text-muted-foreground">{formatValeursEstimees(aliment)}</span>
						</span>
					{/each}
				</div>
			</Alert>
		{/if}

		{#if aUnRatioADeplacer}
			<Alert variant="warning" title="Baisser la ration ne corrige pas ces ratios">
				Ces valeurs sont calculées par rapport aux calories (ou à la matière sèche), pas au poids
				donné — réduire ou augmenter la ration déplace les calories et le nutriment dans les mêmes
				proportions, donc le ratio ne change pas. Pour corriger un déficit ou un excès, il faut
				changer d'aliment, ou ajuster la répartition croquette / pâtée (fiche "Mes chats").
				{#if glucidesEnAttention && log.ration.glucidesParAliment.length > 0}
					<div class="mt-2 flex flex-col gap-1">
						<span class="font-medium">Répartition des glucides par aliment actif :</span>
						{#each log.ration.glucidesParAliment as aliment, i (aliment.foodId)}
							<span class="flex items-center justify-between">
								<span>{i === 0 ? '🔴' : '⚪'} {aliment.foodName}</span>
								<span>{aliment.pctMatiereSeche.toFixed(0)}% MS</span>
							</span>
						{/each}
						<span class="mt-1">
							{log.ration.glucidesParAliment[0].foodName} tirait la ration vers le haut ce jour-là.
						</span>
					</div>
				{:else if glucidesEnAttention}
					Pour les glucides en particulier : les croquettes en contiennent généralement plus que la
					pâtée (féculents utilisés comme liant) — comparez le %MS glucides de vos aliments actifs
					sur la fiche <a href="/aliments" class="underline">Aliments</a>, ou augmentez la part de
					pâtée.
				{/if}
			</Alert>
		{/if}

		<p class="text-xs text-muted-foreground">
			Protéines, lipides et taurine n'ont volontairement pas de maximum : un chat carnivore n'a pas
			besoin d'être limité dessus. Le vrai risque de "trop", c'est l'excès calorique total — déjà
			surveillé par la barre kcal / DER en haut de cette carte.
		</p>

		<p class="text-xs text-muted-foreground">
			Estimation basée sur les infos disponibles sur l'étiquette — ne remplace pas un avis
			vétérinaire, à vérifier avec le dosage conseillé sur le paquet.
		</p>
	</Card>
{/if}
