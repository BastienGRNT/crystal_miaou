<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/atoms/Button.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Select from '$lib/components/atoms/Select.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Disclosure from '$lib/components/molecules/Disclosure.svelte';

	type FoodType = 'croquette' | 'patee' | 'friandise';

	interface FoodOption {
		id: string;
		name: string;
		brand: string;
		type: FoodType;
	}

	interface CatFoodSelection {
		id: string;
		activeCroquetteFoodId: string | null;
		activePateeFoodId: string | null;
		activeFriandiseFoodId: string | null;
		friandiseQuantiteTotaleG: string | null;
	}

	interface DailyPlanOption {
		id: string;
		name: string;
		isActive: boolean;
	}

	let {
		cat,
		foods,
		dailyPlans
	}: {
		cat: CatFoodSelection;
		foods: FoodOption[];
		dailyPlans: DailyPlanOption[];
	} = $props();

	const croquettes = $derived(foods.filter((f) => f.type === 'croquette'));
	const patees = $derived(foods.filter((f) => f.type === 'patee'));
	const friandises = $derived(foods.filter((f) => f.type === 'friandise'));

	let croquetteFoodId = $state(cat.activeCroquetteFoodId ?? '');
	let pateeFoodId = $state(cat.activePateeFoodId ?? '');
	let friandiseFoodId = $state(cat.activeFriandiseFoodId ?? '');
	let friandiseQuantiteTotaleG = $state(cat.friandiseQuantiteTotaleG ?? '');

	let loading = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const activeDailyPlanId = $derived(dailyPlans.find((plan) => plan.isActive)?.id ?? '');
	let routineLoading = $state(false);

	function foodLabel(food: FoodOption): string {
		return `${food.name} (${food.brand})`;
	}

	/** Résumé replié : ce que le chat mange en ce moment, en une ligne — l'utilisateur n'a besoin
	 * d'ouvrir le formulaire que le jour où il change de sac ou de routine. */
	const resumeSelection = $derived.by(() => {
		const noms = [croquetteFoodId, pateeFoodId, friandiseFoodId]
			.map((id) => foods.find((f) => f.id === id)?.name)
			.filter((nom): nom is string => Boolean(nom));
		if (noms.length === 0) return 'Aucun aliment choisi pour le moment.';
		const routine = dailyPlans.find((plan) => plan.isActive)?.name;
		return routine ? `${noms.join(' · ')} — routine ${routine}` : noms.join(' · ');
	});

	/** Ouvert d'office tant qu'aucun aliment principal n'est choisi : sans ça, l'app ne peut rien
	 * calculer et l'écran resterait vide sans que l'utilisateur sache où cliquer. */
	const aucunAlimentPrincipal = $derived(!croquetteFoodId && !pateeFoodId);

	async function handleRoutineChange(event: Event) {
		const planId = (event.target as HTMLSelectElement).value;
		if (!planId) return;

		routineLoading = true;
		await fetch(`/api/v1/daily-plans/${planId}/activate`, { method: 'POST' });
		routineLoading = false;
		await invalidateAll();
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		saved = false;

		if (!croquetteFoodId && !pateeFoodId) {
			error = 'Choisissez au moins une pâtée ou une croquette.';
			return;
		}

		loading = true;

		const response = await fetch(`/api/v1/cats/${cat.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				croquetteFoodId: croquetteFoodId || null,
				pateeFoodId: pateeFoodId || null,
				friandiseFoodId: friandiseFoodId || null,
				friandiseQuantiteTotaleG: friandiseFoodId ? Number(friandiseQuantiteTotaleG) : null
			})
		});

		loading = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			error = body.errors ? (Object.values(body.errors)[0] as string) : "Impossible d'enregistrer.";
			return;
		}

		saved = true;
		await invalidateAll();
	}
</script>

<Disclosure
	title="Ce que mange ce chat en ce moment"
	subtitle={resumeSelection}
	open={aucunAlimentPrincipal}
>
	<FormField label="Routine active" for="dailyPlanId">
		{#if dailyPlans.length === 0}
			<p class="text-sm text-muted-foreground">
				Aucune routine pour ce chat. <a href="/repas/routines">Créez-en une</a> pour définir les
				heures des repas.
			</p>
		{:else}
			<Select id="dailyPlanId" value={activeDailyPlanId} onchange={handleRoutineChange} disabled={routineLoading}>
				{#each dailyPlans as plan (plan.id)}
					<option value={plan.id}>{plan.name}</option>
				{/each}
			</Select>
			<p class="mt-1 text-sm text-muted-foreground">
				<a href="/repas/routines">Gérer les routines</a> (heures, créneaux).
			</p>
		{/if}
	</FormField>

	<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
		<FormField label="Croquette" for="croquetteFoodId">
			<Select id="croquetteFoodId" bind:value={croquetteFoodId}>
				<option value="">Aucune</option>
				{#each croquettes as food (food.id)}
					<option value={food.id}>{foodLabel(food)}</option>
				{/each}
			</Select>
			{#if croquettes.length === 0}
				<p class="mt-1 text-sm text-muted-foreground">
					Aucune croquette dans le catalogue. <a href="/aliments">Ajoutez-en une</a>.
				</p>
			{/if}
		</FormField>

		<FormField label="Pâtée" for="pateeFoodId">
			<Select id="pateeFoodId" bind:value={pateeFoodId}>
				<option value="">Aucune</option>
				{#each patees as food (food.id)}
					<option value={food.id}>{foodLabel(food)}</option>
				{/each}
			</Select>
			{#if patees.length === 0}
				<p class="mt-1 text-sm text-muted-foreground">
					Aucune pâtée dans le catalogue. <a href="/aliments">Ajoutez-en une</a>.
				</p>
			{/if}
		</FormField>

		<FormField label="Friandise (optionnel)" for="friandiseFoodId">
			<Select id="friandiseFoodId" bind:value={friandiseFoodId}>
				<option value="">Aucune</option>
				{#each friandises as food (food.id)}
					<option value={food.id}>{foodLabel(food)}</option>
				{/each}
			</Select>
		</FormField>

		{#if friandiseFoodId}
			<FormField label="Quantité de friandise par jour (g)" for="friandiseQuantiteTotaleG">
				<Input id="friandiseQuantiteTotaleG" type="number" min="0" step="0.5" bind:value={friandiseQuantiteTotaleG} />
			</FormField>
		{/if}

		{#if error}<Alert variant="danger">{error}</Alert>{/if}
		{#if saved}<Alert variant="success">Enregistré.</Alert>{/if}

		<Button type="submit" block disabled={loading}>
			{#if loading}<Spinner />{/if}
			{loading ? 'Enregistrement...' : 'Enregistrer'}
		</Button>
	</form>
</Disclosure>
