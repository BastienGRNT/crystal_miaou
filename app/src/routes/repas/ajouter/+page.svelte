<script lang="ts">
	import { validateMealEntryInput, type MealEntryInput } from '$lib/domain/mealEntry.calc';
	import Card from '$lib/components/atoms/Card.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Select from '$lib/components/atoms/Select.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import IconButton from '$lib/components/atoms/IconButton.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CirclePlus from '@lucide/svelte/icons/circle-plus';

	interface CatOption {
		id: string;
		name: string;
	}

	interface FoodOption {
		id: string;
		name: string;
		brand: string;
	}

	interface PlannedMealEntry {
		id: string;
		consumedAt: string;
		food: { id: string; name: string; brand: string };
	}

	let { data }: { data: { cats: CatOption[]; foods: FoodOption[] } } = $props();

	function nowLocalDatetime(): string {
		const now = new Date();
		const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
		return local.toISOString().slice(0, 16);
	}

	let catId = $state(data.cats.length === 1 ? data.cats[0].id : '');
	let foodQuery = $state('');
	let foodId = $state('');
	let consumedAt = $state(nowLocalDatetime());

	let errors = $state<Partial<Record<keyof MealEntryInput, string>>>({});
	let submitError = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let loading = $state(false);

	let plannedMeals = $state<PlannedMealEntry[]>([]);
	let loadingPlannedMeals = $state(false);

	function formatHeure(value: string): string {
		return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}

	async function refreshPlannedMeals() {
		if (!catId || !consumedAt) {
			plannedMeals = [];
			return;
		}

		loadingPlannedMeals = true;
		const date = consumedAt.slice(0, 10);
		const response = await fetch(`/api/v1/meal-entries?catId=${catId}&date=${date}`);
		loadingPlannedMeals = false;

		if (!response.ok) return;

		const body = await response.json();
		plannedMeals = body.mealEntries;
	}

	async function handleDeletePlannedMeal(id: string) {
		await fetch(`/api/v1/meal-entries/${id}`, { method: 'DELETE' });
		await refreshPlannedMeals();
	}

	$effect(() => {
		catId;
		consumedAt;
		refreshPlannedMeals();
	});

	const filteredFoods = $derived(
		foodQuery.trim()
			? data.foods.filter((food) => {
					const query = foodQuery.trim().toLowerCase();
					return food.name.toLowerCase().includes(query) || food.brand.toLowerCase().includes(query);
				})
			: data.foods
	);

	const selectedFood = $derived(data.foods.find((food) => food.id === foodId) ?? null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitError = null;
		successMessage = null;

		const input: MealEntryInput = {
			catId,
			foodId,
			quantityG: null,
			consumedAt: consumedAt ? new Date(consumedAt).toISOString() : ''
		};

		const validation = validateMealEntryInput(input);
		errors = validation.errors;

		if (!validation.valid) {
			return;
		}

		loading = true;

		const response = await fetch('/api/v1/meal-entries', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});

		loading = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			errors = body.errors ?? {};
			submitError = "Impossible d'enregistrer le repas.";
			return;
		}

		successMessage = 'Repas ajouté au journal.';
		foodQuery = '';
		foodId = '';
		consumedAt = nowLocalDatetime();
		await refreshPlannedMeals();
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:py-10">
	<PageHeader title="Ajouter un repas" subtitle="Enregistrez ce que votre chat a mangé." />

	{#if data.cats.length === 0}
		<Alert variant="info">
			Aucun chat enregistré. <a href="/onboarding/chat">Créez d'abord un profil de chat</a>.
		</Alert>
	{:else if data.foods.length === 0}
		<Alert variant="info">
			Aucun aliment dans le catalogue. <a href="/aliments">Ajoutez d'abord un aliment</a>.
		</Alert>
	{:else}
		<form class="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-md" onsubmit={handleSubmit}>
			{#if data.cats.length > 1}
				<FormField label="Chat" for="catId" error={errors.catId}>
					<Select id="catId" bind:value={catId}>
						<option value="" disabled>Sélectionner un chat</option>
						{#each data.cats as cat (cat.id)}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</Select>
				</FormField>
			{/if}

			<FormField label="Aliment" for="foodQuery" error={errors.foodId}>
				<div class="relative">
					<Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="foodQuery"
						type="text"
						placeholder="Rechercher un aliment (nom, marque)..."
						bind:value={foodQuery}
						autocomplete="off"
						class="pl-9"
					/>
				</div>
			</FormField>

			<div class="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1">
				{#each filteredFoods as food (food.id)}
					<button
						type="button"
						class="flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted {foodId === food.id ? 'bg-primary-muted text-primary' : 'text-foreground'}"
						onclick={() => (foodId = food.id)}
					>
						<span>{food.name}</span>
						<span class="text-muted-foreground">{food.brand}</span>
					</button>
				{:else}
					<p class="px-2.5 py-1.5 text-sm text-muted-foreground">Aucun résultat.</p>
				{/each}
			</div>

			{#if selectedFood}
				<p class="text-sm text-muted-foreground">Sélectionné : <strong class="text-foreground">{selectedFood.name}</strong> ({selectedFood.brand})</p>
			{/if}

			<FormField label="Date et heure" for="consumedAt" error={errors.consumedAt}>
				<Input id="consumedAt" type="datetime-local" bind:value={consumedAt} />
			</FormField>

			{#if submitError}<Alert variant="danger">{submitError}</Alert>{/if}
			{#if successMessage}<Alert variant="success">{successMessage}</Alert>{/if}

			<Button type="submit" block disabled={loading}>
				{#if loading}<Spinner />{:else}<CirclePlus />{/if}
				{loading ? 'Enregistrement...' : 'Ajouter le repas'}
			</Button>
		</form>

		<Card class="mt-4">
			{#snippet header()}
				<h3 class="text-[17px] leading-tight">Repas planifiés ce jour-là</h3>
			{/snippet}
			{#if loadingPlannedMeals}
				<p class="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Chargement…</p>
			{:else if plannedMeals.length === 0}
				<p class="text-sm text-muted-foreground">Aucun repas planifié pour l'instant.</p>
			{:else}
				<div class="flex flex-col gap-1">
					{#each plannedMeals as meal (meal.id)}
						<div class="flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm">
							<span class="text-foreground"><strong class="font-heading">{formatHeure(meal.consumedAt)}</strong> — {meal.food.name} ({meal.food.brand})</span>
							<IconButton label="Supprimer ce repas" variant="danger" onclick={() => handleDeletePlannedMeal(meal.id)}>
								<Trash2 />
							</IconButton>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	{/if}
</div>
