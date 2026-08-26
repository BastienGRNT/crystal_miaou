<script lang="ts">
	import Card from '$lib/components/atoms/Card.svelte';
	import Progress from '$lib/components/atoms/Progress.svelte';
	import Beef from '@lucide/svelte/icons/beef';
	import Drumstick from '@lucide/svelte/icons/drumstick';
	import Fish from '@lucide/svelte/icons/fish';
	import Flame from '@lucide/svelte/icons/flame';
	import type { RepartitionOkResponse } from './DailyMealSchedule.svelte';

	type FoodType = 'croquette' | 'patee' | 'friandise';

	let { repartition }: { repartition: RepartitionOkResponse } = $props();

	const totauxParType = $derived.by(() => {
		const totaux: Record<FoodType, number> = { croquette: 0, patee: 0, friandise: 0 };
		for (const repas of repartition.repas) {
			totaux[repas.foodType] += repas.quantiteG;
		}
		return totaux;
	});

	const foodIdsEmEstimee = $derived(
		new Set(repartition.ration.fiabiliteParAliment.filter((a) => a.emEstimee).map((a) => a.foodId))
	);

	function typeReposeSurEmEstimee(type: FoodType): boolean {
		return repartition.repas.some((r) => r.foodType === type && foodIdsEmEstimee.has(r.food.id));
	}

	const progressionPct = $derived(
		repartition.der > 0 ? Math.min(100, Math.round((repartition.ration.totalKcal / repartition.der) * 100)) : 0
	);
</script>

<Card>
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-2.5">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
				<Flame class="size-5" />
			</span>
			<p class="text-foreground">
				<strong class="font-heading text-2xl">{Math.round(repartition.ration.totalKcal)}</strong>
				<span class="text-lg text-muted-foreground">/ {Math.round(repartition.der)} kcal</span>
				<span class="block text-xs text-muted-foreground sm:inline">
					({progressionPct}%) — RER {Math.round(repartition.rer)} kcal, facteur {repartition.facteurDER}
				</span>
			</p>
		</div>
		<Progress value={progressionPct} />
	</div>

	<p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
		<span class="font-heading text-xs font-semibold tracking-wide text-foreground uppercase">Total du jour</span>
		{#if totauxParType.croquette > 0}
			<span class="inline-flex items-center gap-1.5">
				<Drumstick class="size-4" />
				{Math.round(totauxParType.croquette)} g{typeReposeSurEmEstimee('croquette') ? '*' : ''}
			</span>
		{/if}
		{#if totauxParType.patee > 0}
			<span class="inline-flex items-center gap-1.5">
				<Beef class="size-4" />
				{Math.round(totauxParType.patee)} g{typeReposeSurEmEstimee('patee') ? '*' : ''}
			</span>
		{/if}
		{#if totauxParType.friandise > 0}
			<span class="inline-flex items-center gap-1.5">
				<Fish class="size-4" />
				{Math.round(totauxParType.friandise)} g{typeReposeSurEmEstimee('friandise') ? '*' : ''}
			</span>
		{/if}
	</p>
</Card>
