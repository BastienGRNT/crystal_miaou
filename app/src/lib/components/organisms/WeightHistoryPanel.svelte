<script lang="ts">
	import Button from '$lib/components/atoms/Button.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import type { TendancePoids } from '$lib/domain/catWeight.calc';

	interface WeightLogEntry {
		id: string;
		weightKg: number;
		recordedAt: string;
	}

	interface Evaluation {
		tendance: TendancePoids | null;
		pctVariation: number | null;
		joursCouverts: number | null;
		suggestion: string | null;
	}

	let { catId }: { catId: string } = $props();

	let historique = $state<WeightLogEntry[]>([]);
	let evaluation = $state<Evaluation | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let submitError = $state<string | null>(null);

	let weightKg = $state('');
	let recordedAt = $state(new Date().toISOString().slice(0, 10));

	const tendanceLabels: Record<TendancePoids, string> = {
		HAUSSE: 'En hausse',
		BAISSE: 'En baisse',
		STABLE: 'Stable'
	};

	async function load() {
		loading = true;
		const response = await fetch(`/api/cats/${catId}/weight-logs`);
		if (response.ok) {
			const body = await response.json();
			historique = body.historique;
			evaluation = body.evaluation;
		}
		loading = false;
	}

	$effect(() => {
		load();
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitError = null;

		const parsed = Number(weightKg);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			submitError = 'Le poids doit être un nombre supérieur à 0.';
			return;
		}

		saving = true;
		const response = await fetch(`/api/cats/${catId}/weight-logs`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ weightKg: parsed, recordedAt })
		});
		saving = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			submitError = body.error ?? "Impossible d'enregistrer la pesée.";
			return;
		}

		weightKg = '';
		await load();
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-muted-foreground">
		Le DER calculé est un point de départ, pas une prescription figée. Repesez régulièrement votre
		chat pour vérifier que la ration suit bien l'objectif — la pratique vétérinaire usuelle est de
		juger la trajectoire après 2-3 semaines, puis d'ajuster avec votre vétérinaire si besoin.
	</p>

	<form class="flex flex-col gap-3" onsubmit={handleSubmit}>
		<div class="flex gap-2">
			<div class="flex-1">
				<FormField label="Poids (kg)" for="weightKg">
					<Input id="weightKg" type="number" step="0.01" min="0" bind:value={weightKg} />
				</FormField>
			</div>
			<div class="flex-1">
				<FormField label="Date" for="recordedAt">
					<Input id="recordedAt" type="date" bind:value={recordedAt} />
				</FormField>
			</div>
		</div>
		{#if submitError}<Alert variant="danger">{submitError}</Alert>{/if}
		<Button type="submit" block disabled={saving}>
			{#if saving}<Spinner />{/if}
			{saving ? 'Enregistrement...' : 'Enregistrer la pesée'}
		</Button>
	</form>

	{#if loading}
		<Spinner />
	{:else}
		{#if evaluation?.tendance}
			<div class="flex items-center gap-2 text-sm">
				<span class="text-foreground">Tendance sur la période :</span>
				<Badge variant="outline">{tendanceLabels[evaluation.tendance]}</Badge>
				{#if evaluation.pctVariation !== null}
					<span class="text-muted-foreground">({evaluation.pctVariation > 0 ? '+' : ''}{evaluation.pctVariation.toFixed(1)}%)</span>
				{/if}
			</div>
		{/if}

		{#if evaluation?.suggestion}
			<Alert variant="warning">{evaluation.suggestion}</Alert>
		{/if}

		{#if historique.length > 0}
			<div class="flex flex-col gap-1.5">
				{#each [...historique].reverse() as pesee (pesee.id)}
					<div class="flex items-center justify-between text-sm">
						<span class="text-muted-foreground">{new Date(pesee.recordedAt).toLocaleDateString('fr-FR')}</span>
						<span class="text-foreground">{pesee.weightKg.toFixed(2)} kg</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">Aucune pesée enregistrée pour l'instant.</p>
		{/if}
	{/if}
</div>
