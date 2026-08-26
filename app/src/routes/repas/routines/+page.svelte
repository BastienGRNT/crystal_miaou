<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { validateDailyPlanInput, type DailyPlanInput } from '$lib/domain/dailyPlan.calc';
	import Card from '$lib/components/atoms/Card.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import IconButton from '$lib/components/atoms/IconButton.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Select from '$lib/components/atoms/Select.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Modal from '$lib/components/molecules/Modal.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Tabs from '$lib/components/molecules/Tabs.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';
	import EmptyState from '$lib/components/molecules/EmptyState.svelte';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Clock from '@lucide/svelte/icons/clock';

	type FoodType = 'croquette' | 'patee' | 'friandise';
	type DistributionMode = 'gamelle' | 'distributeur_automatique' | 'gamelle_ludique';

	const foodTypeLabels: Record<FoodType, string> = {
		croquette: 'Croquette',
		patee: 'Pâtée',
		friandise: 'Friandise'
	};

	const distributionModeLabels: Record<DistributionMode, string> = {
		gamelle: 'Gamelle',
		distributeur_automatique: 'Distributeur automatique',
		gamelle_ludique: 'Gamelle ludique'
	};

	interface CatOption {
		id: string;
		name: string;
	}

	interface DailyPlanSlotRecord {
		id: string;
		timeOfDay: string;
		foodType: FoodType;
		distributionMode: DistributionMode;
	}

	interface DailyPlanRecord {
		id: string;
		catId: string;
		name: string;
		isActive: boolean;
		slots: DailyPlanSlotRecord[];
	}

	let {
		data
	}: {
		data: { cats: CatOption[]; activeCatId: string | null; dailyPlans: DailyPlanRecord[] };
	} = $props();

	interface SlotDraft {
		timeOfDay: string;
		foodType: FoodType;
		distributionMode: DistributionMode;
	}

	let showModal = $state(false);
	let editingPlanId = $state<string | null>(null);
	let name = $state('');
	let slots = $state<SlotDraft[]>([]);
	let errors = $state<ReturnType<typeof validateDailyPlanInput>['errors']>({});
	let submitError = $state<string | null>(null);
	let loading = $state(false);

	function defaultSlots(count: number): SlotDraft[] {
		return Array.from({ length: count }, (_, i) => ({
			timeOfDay: heureParDefaut(i, count),
			foodType: 'croquette' as FoodType,
			distributionMode: 'gamelle' as DistributionMode
		}));
	}

	// Étale les heures par défaut entre 08:00 et 20:00 pour éviter que deux créneaux se
	// retrouvent silencieusement à la même heure tant que l'utilisateur ne les a pas modifiées.
	function heureParDefaut(index: number, count: number): string {
		if (count <= 1) return '08:00';
		const minutesDebut = 8 * 60;
		const minutesFin = 20 * 60;
		const minutes = minutesDebut + Math.round(((minutesFin - minutesDebut) * index) / (count - 1));
		const heures = Math.floor(minutes / 60)
			.toString()
			.padStart(2, '0');
		const reste = (minutes % 60).toString().padStart(2, '0');
		return `${heures}:${reste}`;
	}

	function resetForm() {
		editingPlanId = null;
		name = '';
		slots = defaultSlots(2);
		errors = {};
		submitError = null;
	}

	function openCreateModal() {
		resetForm();
		showModal = true;
	}

	function openEditModal(plan: DailyPlanRecord) {
		editingPlanId = plan.id;
		name = plan.name;
		slots = plan.slots.map((slot) => ({
			timeOfDay: slot.timeOfDay,
			foodType: slot.foodType,
			distributionMode: slot.distributionMode
		}));
		errors = {};
		submitError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function addSlot() {
		slots = [
			...slots,
			{
				timeOfDay: heureParDefaut(slots.length, slots.length + 1),
				foodType: 'croquette',
				distributionMode: 'gamelle'
			}
		];
	}

	function removeSlot(index: number) {
		slots = slots.filter((_, i) => i !== index);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitError = null;

		if (!data.activeCatId) return;

		const input: DailyPlanInput = {
			catId: data.activeCatId,
			name,
			slots: slots.map((slot) => ({
				timeOfDay: slot.timeOfDay,
				foodType: slot.foodType,
				distributionMode: slot.distributionMode
			}))
		};

		const validation = validateDailyPlanInput(input);
		errors = validation.errors;

		if (!validation.valid) {
			return;
		}

		loading = true;

		const response = await fetch(editingPlanId ? `/api/daily-plans/${editingPlanId}` : '/api/daily-plans', {
			method: editingPlanId ? 'PATCH' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});

		loading = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			errors = body.errors ?? {};
			submitError = "Impossible d'enregistrer la routine.";
			return;
		}

		showModal = false;
		await invalidateAll();
	}

	async function handleActivate(plan: DailyPlanRecord) {
		await fetch(`/api/daily-plans/${plan.id}/activate`, { method: 'POST' });
		await invalidateAll();
	}

	async function handleDelete(plan: DailyPlanRecord) {
		if (!confirm(`Supprimer la routine "${plan.name}" ?`)) return;

		await fetch(`/api/daily-plans/${plan.id}`, { method: 'DELETE' });
		await invalidateAll();
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:py-10">
	<PageHeader
		title="Routines"
		subtitle="Définissez le rythme des repas de votre chat (heure et type d'aliment). Les aliments précis du jour se choisissent sur l'écran d'accueil."
	/>

	{#if data.cats.length === 0}
		<Alert variant="info">
			Aucun chat enregistré. <a href="/onboarding/chat">Créez d'abord un profil de chat</a>.
		</Alert>
	{:else}
		{#if data.cats.length > 1}
			<Tabs
				class="mb-4"
				items={data.cats.map((cat) => ({ value: cat.id, label: cat.name, href: `/repas/routines?catId=${cat.id}` }))}
				value={data.activeCatId ?? ''}
			/>
		{/if}

		<Button onclick={openCreateModal} class="mb-4"><Plus />Nouvelle routine</Button>

		<div class="flex flex-col gap-3">
			{#each data.dailyPlans as plan (plan.id)}
				<Card>
					{#snippet header()}
						<div class="flex items-center gap-2.5">
							<span class="flex size-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
								<CalendarClock class="size-4.5" />
							</span>
							<div>
								<h3 class="text-[17px] leading-tight">{plan.name}</h3>
								<p class="text-sm text-muted-foreground">{plan.slots.length} repas/jour</p>
							</div>
						</div>
						{#if plan.isActive}<Badge variant="success">Active</Badge>{/if}
					{/snippet}

					<div class="flex flex-col gap-1">
						{#each plan.slots as slot (slot.id)}
							<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
								<Clock class="size-3.5" />
								<strong class="font-heading text-foreground">{slot.timeOfDay}</strong> — {foodTypeLabels[slot.foodType]}
								<span class="text-xs">({distributionModeLabels[slot.distributionMode]})</span>
							</p>
						{/each}
					</div>

					<div class="flex gap-2">
						{#if !plan.isActive}
							<Button variant="secondary" size="sm" onclick={() => handleActivate(plan)}>Activer</Button>
						{/if}
						<Button variant="secondary" size="sm" onclick={() => openEditModal(plan)}>Modifier</Button>
						<Button variant="secondary" size="sm" onclick={() => handleDelete(plan)}>Supprimer</Button>
					</div>
				</Card>
			{:else}
				<EmptyState icon={CalendarClock} title="Aucune routine" description="Créez une routine pour planifier les repas de la journée." />
			{/each}
		</div>
	{/if}
</div>

{#if showModal}
	<Modal title={editingPlanId ? 'Modifier la routine' : 'Nouvelle routine'} onclose={closeModal}>
		<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
			<FormField label="Nom" for="name" error={errors.name}>
				<Input id="name" type="text" bind:value={name} autocomplete="off" placeholder="Semaine, Week-end..." />
			</FormField>

			<div class="flex flex-col gap-3">
				{#each slots as slot, i}
					<div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
						<div class="flex items-center justify-between">
							<span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Repas {i + 1}</span>
							<IconButton label="Retirer ce repas" variant="danger" onclick={() => removeSlot(i)}>
								<Trash2 />
							</IconButton>
						</div>

						<FormField label="Heure" for={`slot-time-${i}`} error={errors.slotErrors?.[i]?.timeOfDay}>
							<Input id={`slot-time-${i}`} type="time" bind:value={slot.timeOfDay} />
						</FormField>

						<FormField label="Aliment" for={`slot-foodtype-${i}`} error={errors.slotErrors?.[i]?.foodType}>
							<Select id={`slot-foodtype-${i}`} bind:value={slot.foodType}>
								<option value="croquette">Croquette</option>
								<option value="patee">Pâtée</option>
								<option value="friandise">Friandise</option>
							</Select>
						</FormField>

						<FormField
							label="Mode de distribution"
							for={`slot-distribution-${i}`}
							error={errors.slotErrors?.[i]?.distributionMode}
						>
							<Select id={`slot-distribution-${i}`} bind:value={slot.distributionMode}>
								<option value="gamelle">Gamelle</option>
								<option value="distributeur_automatique">Distributeur automatique</option>
								<option value="gamelle_ludique">Gamelle ludique</option>
							</Select>
						</FormField>
					</div>
				{/each}
			</div>
			{#if errors.slots}<Alert variant="danger">{errors.slots}</Alert>{/if}

			<div class="flex gap-2">
				<Button type="button" variant="secondary" onclick={addSlot}><Plus />Ajouter un repas</Button>
			</div>

			{#if submitError}<Alert variant="danger">{submitError}</Alert>{/if}

			<Button type="submit" block disabled={loading}>
				{#if loading}<Spinner />{/if}
				{loading ? 'Enregistrement...' : 'Enregistrer'}
			</Button>
		</form>
	</Modal>
{/if}
