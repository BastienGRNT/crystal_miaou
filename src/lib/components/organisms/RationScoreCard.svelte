<script lang="ts">
	import Card from '$lib/components/atoms/Card.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Disclosure from '$lib/components/molecules/Disclosure.svelte';
	import type { ActionScore, NiveauScore, ScoreRation, StatutAxe } from '$lib/domain/score.calc';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Sparkles from '@lucide/svelte/icons/sparkles';

	let { score, catName }: { score: ScoreRation; catName: string } = $props();

	/** Nombre d'actions visibles sans déplier : au-delà, la carte redevient un mur de texte — ce
	 * qu'elle est justement censée remplacer. */
	const ACTIONS_VISIBLES = 2;

	const couleurNiveau: Record<NiveauScore, string> = {
		excellent: 'text-success',
		bon: 'text-success',
		correct: 'text-primary',
		a_ameliorer: 'text-warning',
		insuffisant: 'text-destructive'
	};

	const badgeNiveau: Record<NiveauScore, 'success' | 'default' | 'warning' | 'danger'> = {
		excellent: 'success',
		bon: 'success',
		correct: 'default',
		a_ameliorer: 'warning',
		insuffisant: 'danger'
	};

	const iconeAxe: Record<StatutAxe, typeof CircleCheck> = {
		ok: CircleCheck,
		attention: CircleAlert,
		probleme: TriangleAlert
	};

	const couleurAxe: Record<StatutAxe, string> = {
		ok: 'text-success',
		attention: 'text-warning',
		probleme: 'text-destructive'
	};

	const impactLabel: Record<ActionScore['impact'], string> = {
		fort: 'Prioritaire',
		moyen: 'Utile',
		faible: 'Bonus'
	};

	const impactBadge: Record<ActionScore['impact'], 'danger' | 'warning' | 'outline'> = {
		fort: 'danger',
		moyen: 'warning',
		faible: 'outline'
	};

	// Anneau de progression : 2πr pour r=42.
	const CIRCONFERENCE = 263.9;
	const arcRempli = $derived((Math.max(0, Math.min(100, score.score)) / 100) * CIRCONFERENCE);

	const actionsVisibles = $derived(score.actions.slice(0, ACTIONS_VISIBLES));
	const actionsRepliees = $derived(score.actions.slice(ACTIONS_VISIBLES));
</script>

{#snippet ligneAction(action: ActionScore)}
	<div class="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
		<div class="flex items-start justify-between gap-2">
			<p class="text-sm font-medium text-foreground">{action.titre}</p>
			<Badge variant={impactBadge[action.impact]}>{impactLabel[action.impact]}</Badge>
		</div>
		<p class="text-xs leading-relaxed text-muted-foreground">{action.detail}</p>
		{#if action.href && action.hrefLabel}
			<a
				href={action.href}
				class="mt-0.5 inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary hover:underline"
			>
				{action.hrefLabel}
				<ArrowRight class="size-3.5" />
			</a>
		{/if}
	</div>
{/snippet}

<Card class="overflow-hidden">
	<div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
		<div class="relative flex size-[104px] shrink-0 items-center justify-center">
			<svg viewBox="0 0 100 100" class="size-full -rotate-90">
				<circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-muted)" stroke-width="8" />
				<circle
					cx="50"
					cy="50"
					r="42"
					fill="none"
					stroke="currentColor"
					stroke-width="8"
					stroke-linecap="round"
					class="{couleurNiveau[score.niveau]} transition-[stroke-dasharray] duration-500 ease-out"
					stroke-dasharray={`${arcRempli} ${CIRCONFERENCE}`}
				/>
			</svg>
			<div class="absolute flex flex-col items-center leading-none">
				<span class="font-heading text-3xl font-extrabold {couleurNiveau[score.niveau]}">{score.score}</span>
				<span class="mt-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">/ 100</span>
			</div>
		</div>

		<div class="flex flex-1 flex-col gap-2 text-center sm:text-left">
			<div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
				<h2 class="font-heading text-xl leading-tight text-foreground">{score.titre}</h2>
				<Badge variant={badgeNiveau[score.niveau]}>Menu de {catName}</Badge>
			</div>
			<p class="text-sm leading-relaxed text-foreground">{score.verdict}</p>
			<a
				href="/comprendre#score"
				class="inline-flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline sm:justify-start"
			>
				<Sparkles class="size-3.5" />
				Comment ce score est calculé
			</a>
		</div>
	</div>

	<div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-3.5 py-3">
		{#each score.axes as axe (axe.id)}
			{@const Icon = iconeAxe[axe.statut]}
			<div class="flex items-start gap-2.5">
				<Icon class="mt-0.5 size-4 shrink-0 {couleurAxe[axe.statut]}" />
				<div class="flex flex-1 flex-col gap-0.5">
					<div class="flex items-baseline justify-between gap-2">
						<span class="text-sm font-medium text-foreground">{axe.label}</span>
						<span class="font-heading text-xs text-muted-foreground">{axe.points}/{axe.pointsMax}</span>
					</div>
					<span class="text-xs leading-relaxed text-muted-foreground">{axe.resume}</span>
				</div>
			</div>
		{/each}
	</div>

	{#if score.actions.length > 0}
		<div class="flex flex-col gap-2">
			<p class="font-heading text-sm font-semibold text-foreground">
				{score.actions.length === 1 ? 'La piste à suivre' : 'Les pistes à suivre'}
			</p>
			{#each actionsVisibles as action (action.id)}
				{@render ligneAction(action)}
			{/each}
		</div>

		{#if actionsRepliees.length > 0}
			<Disclosure
				title={`${actionsRepliees.length} autre${actionsRepliees.length > 1 ? 's' : ''} piste${actionsRepliees.length > 1 ? 's' : ''}`}
				subtitle="Moins d'impact, à traiter quand vous aurez le temps."
				class="shadow-none"
			>
				{#each actionsRepliees as action (action.id)}
					{@render ligneAction(action)}
				{/each}
			</Disclosure>
		{/if}
	{:else}
		<p class="text-xs text-muted-foreground">
			Rien à corriger aujourd'hui : servez les quantités affichées plus bas et cochez-les au fur et à
			mesure.
		</p>
	{/if}
</Card>
