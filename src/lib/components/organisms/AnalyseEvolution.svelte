<script lang="ts">
	import Card from '$lib/components/atoms/Card.svelte';
	import EmptyState from '$lib/components/molecules/EmptyState.svelte';
	import type { RepartitionFoodType } from '$lib/domain/repartition.calc';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import Beef from '@lucide/svelte/icons/beef';
	import Drumstick from '@lucide/svelte/icons/drumstick';
	import Fish from '@lucide/svelte/icons/fish';

	type StatutJour = 'OK' | 'DEFICIT' | 'EXCES' | 'SANS_DONNEE';

	interface JourAnalyse {
		date: string;
		totalKcal: number;
		der: number;
		pctDER: number;
		grammesParType: Record<RepartitionFoodType, number>;
		statut: StatutJour;
	}

	export interface AnalyseOkResponse {
		success: true;
		rer: number;
		der: number;
		jours: JourAnalyse[];
		moyennePctDER: number | null;
		tauxConformitePct: number | null;
		moyenneGrammesParType: Record<RepartitionFoodType, number>;
	}

	let { analyse }: { analyse: AnalyseOkResponse } = $props();

	const ECHELLE_MAX_PCT = 150;

	const barColor: Record<StatutJour, string> = {
		OK: 'bg-success',
		DEFICIT: 'bg-destructive',
		EXCES: 'bg-warning',
		SANS_DONNEE: 'bg-muted'
	};

	function barHeightPct(jour: JourAnalyse): number {
		if (jour.statut === 'SANS_DONNEE') return 4;
		return Math.max(4, Math.min(100, (jour.pctDER / ECHELLE_MAX_PCT) * 100));
	}

	function formatDateCourte(isoDate: string): string {
		return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}

	function formatDateTooltip(jour: JourAnalyse): string {
		if (jour.statut === 'SANS_DONNEE') return `${formatDateCourte(jour.date)} — aucune donnée`;
		return `${formatDateCourte(jour.date)} — ${Math.round(jour.totalKcal)} / ${Math.round(jour.der)} kcal (${jour.pctDER}%)`;
	}

	const foodTypeIcon: Record<RepartitionFoodType, typeof Beef> = {
		croquette: Drumstick,
		patee: Beef,
		friandise: Fish
	};

	const foodTypeLabel: Record<RepartitionFoodType, string> = {
		croquette: 'Croquette',
		patee: 'Pâtée',
		friandise: 'Friandise'
	};

	const joursAvecDonnee = $derived(analyse.jours.some((j) => j.statut !== 'SANS_DONNEE'));
</script>

{#if !joursAvecDonnee}
	<EmptyState
		icon={ChartLine}
		title="Pas encore de données"
		description="L'analyse se remplira au fil des jours renseignés."
	/>
{:else}
	<Card>
		{#snippet header()}
			<h3 class="text-[17px] leading-tight">Apport calorique quotidien vs besoin (DER)</h3>
		{/snippet}

		<div class="flex h-40 items-end gap-1">
			{#each analyse.jours as jour (jour.date)}
				<div class="group relative flex flex-1 flex-col items-center justify-end" title={formatDateTooltip(jour)}>
					<div
						class="w-full rounded-t transition-transform group-hover:scale-x-110 {barColor[jour.statut]}"
						style={`height: ${barHeightPct(jour)}%`}
					></div>
				</div>
			{/each}
		</div>
		<div class="flex justify-between text-xs text-muted-foreground">
			<span>{formatDateCourte(analyse.jours[0].date)}</span>
			<span>{formatDateCourte(analyse.jours[analyse.jours.length - 1].date)}</span>
		</div>

		<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
			<span class="flex items-center gap-1"><span class="size-2 rounded-full bg-success"></span> Conforme (±10% du DER)</span>
			<span class="flex items-center gap-1"><span class="size-2 rounded-full bg-destructive"></span> Déficit</span>
			<span class="flex items-center gap-1"><span class="size-2 rounded-full bg-warning"></span> Excès</span>
			<span class="flex items-center gap-1"><span class="size-2 rounded-full bg-muted"></span> Sans donnée</span>
		</div>
	</Card>

	<div class="grid grid-cols-2 gap-4">
		<Card class="items-center text-center">
			<p class="font-heading text-3xl font-extrabold text-primary">
				{analyse.moyennePctDER !== null ? `${analyse.moyennePctDER}%` : '—'}
			</p>
			<p class="text-xs text-muted-foreground">Apport moyen / DER</p>
		</Card>
		<Card class="items-center text-center">
			<p class="font-heading text-3xl font-extrabold text-secondary">
				{analyse.tauxConformitePct !== null ? `${analyse.tauxConformitePct}%` : '—'}
			</p>
			<p class="text-xs text-muted-foreground">Jours conformes</p>
		</Card>
	</div>

	<Card>
		{#snippet header()}
			<h3 class="text-[17px] leading-tight">Répartition moyenne par jour</h3>
		{/snippet}
		<div class="flex flex-col gap-1.5">
			{#each Object.entries(analyse.moyenneGrammesParType) as [type, grammes] (type)}
				{#if grammes > 0}
					{@const Icon = foodTypeIcon[type as RepartitionFoodType]}
					<div class="flex items-center justify-between text-sm">
						<span class="flex items-center gap-2 text-foreground">
							<Icon class="size-4 text-muted-foreground" />
							{foodTypeLabel[type as RepartitionFoodType]}
						</span>
						<span class="font-heading font-semibold text-foreground">{grammes.toFixed(0)} g/j</span>
					</div>
				{/if}
			{/each}
		</div>
		<p class="text-xs text-muted-foreground">
			DER de référence actuel du chat : {Math.round(analyse.der)} kcal/j (RER {Math.round(analyse.rer)} kcal).
		</p>
	</Card>
{/if}
