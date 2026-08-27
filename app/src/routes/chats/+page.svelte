<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		CAT_ACTIVITY_LEVEL_VALUES,
		CAT_DER_AJUSTEMENT_PCT_VALEURS,
		CAT_SEX_VALUES,
		CAT_SPECIAL_CONDITION_VALUES,
		validateCatProfileInput,
		type CatActivityLevel,
		type CatProfileInput,
		type CatSex,
		type CatSpecialCondition
	} from '$lib/domain/cat.calc';
	import Card from '$lib/components/atoms/Card.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Select from '$lib/components/atoms/Select.svelte';
	import Checkbox from '$lib/components/atoms/Checkbox.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Modal from '$lib/components/molecules/Modal.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';
	import EmptyState from '$lib/components/molecules/EmptyState.svelte';
	import WeightHistoryPanel from '$lib/components/organisms/WeightHistoryPanel.svelte';
	import HouseholdMembersPanel from '$lib/components/organisms/HouseholdMembersPanel.svelte';
	import Cat from '@lucide/svelte/icons/cat';
	import Venus from '@lucide/svelte/icons/venus';
	import Mars from '@lucide/svelte/icons/mars';
	import Zap from '@lucide/svelte/icons/zap';
	import Scale from '@lucide/svelte/icons/scale';
	import Users from '@lucide/svelte/icons/users';

	interface CatRecord {
		id: string;
		name: string;
		weightKg: string;
		birthDate: string | null;
		ageMonths: number | null;
		sex: CatSex;
		sterilized: boolean;
		activityLevel: CatActivityLevel;
		hasOutdoorAccess: boolean;
		specialCondition: CatSpecialCondition;
		derAjustementPct: number;
	}

	let { data }: { data: { cats: CatRecord[]; currentUserId: string } } = $props();

	const activityLabels: Record<CatActivityLevel, string> = {
		faible: 'Faible',
		modere: 'Modéré',
		eleve: 'Élevé'
	};

	const conditionLabels: Record<CatSpecialCondition, string> = {
		aucune: 'Aucune',
		gestation: 'Gestation',
		croissance: 'Croissance',
		surpoids: 'Surpoids'
	};

	const sexLabels: Record<CatSex, string> = {
		male: 'Mâle',
		femelle: 'Femelle'
	};

	// Formatage d'affichage pur : `ageMonths` est calculé par l'API (CLAUDE.md règle 9), jamais recalculé
	// ici à partir de `birthDate`.
	function ageLabel(ageMonths: number | null): string {
		if (ageMonths === null) return 'Âge inconnu';
		const years = Math.floor(ageMonths / 12);
		return years >= 1 ? `${years} an${years > 1 ? 's' : ''}` : `${ageMonths} mois`;
	}

	let showModal = $state(false);
	let editingCatId = $state<string | null>(null);

	let name = $state('');
	let weightKg = $state('');
	let birthDate = $state('');
	let sex = $state<CatSex>('male');
	let sterilized = $state(false);
	let activityLevel = $state<CatActivityLevel>('modere');
	let hasOutdoorAccess = $state(false);
	let specialCondition = $state<CatSpecialCondition>('aucune');

	let errors = $state<Partial<Record<keyof CatProfileInput, string>>>({});
	let submitError = $state<string | null>(null);
	let loading = $state(false);

	let weightModalCatId = $state<string | null>(null);
	let householdModalCatId = $state<string | null>(null);

	let derAjustementSavingCatId = $state<string | null>(null);
	let derAjustementErrorCatId = $state<string | null>(null);

	function derAjustementLabel(value: number): string {
		if (value === 0) return 'Normal';
		return `${value > 0 ? '+' : ''}${value}%`;
	}

	/** Réglage rapide en un clic depuis la card — pas de modale, pas de "Enregistrer" à confirmer, en
	 * ligne avec le suivi de poids décrit dans /comprendre (§5) qui est déjà un ajustement manuel ponctuel. */
	async function setDerAjustement(catId: string, value: number) {
		derAjustementSavingCatId = catId;
		derAjustementErrorCatId = null;

		const response = await fetch(`/api/cats/${catId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ derAjustementPct: value })
		});

		derAjustementSavingCatId = null;

		if (!response.ok) {
			derAjustementErrorCatId = catId;
			return;
		}

		await invalidateAll();
	}

	function openEditModal(cat: CatRecord) {
		editingCatId = cat.id;
		name = cat.name;
		weightKg = cat.weightKg;
		birthDate = cat.birthDate ?? '';
		sex = cat.sex;
		sterilized = cat.sterilized;
		activityLevel = cat.activityLevel;
		hasOutdoorAccess = cat.hasOutdoorAccess;
		specialCondition = cat.specialCondition;
		errors = {};
		submitError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitError = null;

		if (!editingCatId) return;

		const input: CatProfileInput = {
			name,
			weightKg: Number(weightKg),
			birthDate,
			sex,
			sterilized,
			activityLevel,
			hasOutdoorAccess,
			specialCondition
		};

		const validation = validateCatProfileInput(input);
		errors = validation.errors;

		if (!validation.valid) {
			return;
		}

		loading = true;

		const response = await fetch(`/api/cats/${editingCatId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});

		loading = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			errors = body.errors ?? {};
			submitError = 'Impossible de mettre à jour le profil.';
			return;
		}

		showModal = false;
		await invalidateAll();
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:py-10">
	<PageHeader title="Mes chats" subtitle="Profils et besoins nutritionnels de vos chats." />

	<div class="flex flex-col gap-3">
		{#each data.cats as cat (cat.id)}
			<Card>
				{#snippet header()}
					<div class="flex items-center gap-2.5">
						<span class="flex size-11 items-center justify-center rounded-full bg-primary-muted text-primary">
							<Cat class="size-5.5" />
						</span>
						<div>
							<h3 class="text-[17px] leading-tight">{cat.name}</h3>
							<p class="flex items-center gap-1 text-sm text-muted-foreground">
								{#if cat.sex === 'male'}<Mars class="size-3.5" />{:else}<Venus class="size-3.5" />{/if}
								{sexLabels[cat.sex]} · {ageLabel(cat.ageMonths)} · {Number(cat.weightKg).toFixed(2)} kg
							</p>
						</div>
					</div>
				{/snippet}

				<div class="flex flex-wrap items-center gap-1.5">
					<Badge variant="outline"><Zap class="size-3" />Activité {activityLabels[cat.activityLevel].toLowerCase()}</Badge>
					<Badge variant="outline">{cat.hasOutdoorAccess ? 'Accès extérieur' : "Intérieur strict"}</Badge>
					{#if cat.specialCondition !== 'aucune'}
						<Badge variant="warning">{conditionLabels[cat.specialCondition]}</Badge>
					{/if}
				</div>

				<div class="flex flex-col gap-1.5">
					<p class="text-xs font-medium text-muted-foreground">Besoin ajusté (après suivi de poids)</p>
					<div class="flex flex-wrap gap-1.5">
						{#each CAT_DER_AJUSTEMENT_PCT_VALEURS as value (value)}
							<Button
								variant={cat.derAjustementPct === value ? 'primary' : 'outline'}
								size="sm"
								disabled={derAjustementSavingCatId === cat.id}
								onclick={() => setDerAjustement(cat.id, value)}
							>
								{derAjustementLabel(value)}
							</Button>
						{/each}
					</div>
					{#if derAjustementErrorCatId === cat.id}
						<p class="text-xs text-destructive">Impossible d'enregistrer l'ajustement, réessayez.</p>
					{/if}
				</div>

				<div class="flex gap-2">
					<Button variant="secondary" size="sm" onclick={() => openEditModal(cat)}>Modifier</Button>
					<Button variant="secondary" size="sm" onclick={() => (weightModalCatId = cat.id)}>
						<Scale />Suivi de poids
					</Button>
					<Button variant="secondary" size="sm" onclick={() => (householdModalCatId = cat.id)}>
						<Users />Foyer
					</Button>
				</div>
			</Card>
		{:else}
			<EmptyState icon={Cat} title="Aucun chat" description="Ajoutez le profil de votre premier chat." />
		{/each}
	</div>
</div>

{#if showModal}
	<Modal title="Modifier le profil" onclose={closeModal}>
		<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
			<FormField label="Nom" for="name" error={errors.name}>
				<Input id="name" type="text" bind:value={name} autocomplete="off" />
			</FormField>

			<FormField label="Poids (kg)" for="weightKg" error={errors.weightKg}>
				<Input id="weightKg" type="number" step="0.01" min="0" bind:value={weightKg} />
			</FormField>

			<FormField label="Date de naissance" for="birthDate" error={errors.birthDate}>
				<Input id="birthDate" type="date" bind:value={birthDate} />
			</FormField>

			<FormField label="Sexe" for="sex" error={errors.sex}>
				<Select id="sex" bind:value={sex}>
					{#each CAT_SEX_VALUES as value (value)}
						<option {value}>{sexLabels[value]}</option>
					{/each}
				</Select>
			</FormField>

			<Checkbox bind:checked={sterilized}>Stérilisé(e)</Checkbox>

			<FormField label="Niveau d'activité" for="activityLevel" error={errors.activityLevel}>
				<Select id="activityLevel" bind:value={activityLevel}>
					{#each CAT_ACTIVITY_LEVEL_VALUES as value (value)}
						<option {value}>{activityLabels[value]}</option>
					{/each}
				</Select>
			</FormField>

			<div class="flex flex-col gap-1">
				<Checkbox bind:checked={hasOutdoorAccess}>A accès à l'extérieur</Checkbox>
				<p class="text-xs text-muted-foreground">
					Un chat d'intérieur strict dépense moins d'énergie qu'un chat qui sort, même avec le même
					niveau d'activité perçu — ça influence le calcul.
				</p>
			</div>

			<FormField label="Condition particulière" for="specialCondition" error={errors.specialCondition}>
				<Select id="specialCondition" bind:value={specialCondition}>
					{#each CAT_SPECIAL_CONDITION_VALUES as value (value)}
						<option {value}>{conditionLabels[value]}</option>
					{/each}
				</Select>
			</FormField>

			{#if submitError}<Alert variant="danger">{submitError}</Alert>{/if}

			<Button type="submit" block disabled={loading}>
				{#if loading}<Spinner />{/if}
				{loading ? 'Enregistrement...' : 'Enregistrer'}
			</Button>
		</form>
	</Modal>
{/if}

{#if weightModalCatId}
	<Modal title="Suivi de poids" onclose={() => (weightModalCatId = null)}>
		<WeightHistoryPanel catId={weightModalCatId} />
	</Modal>
{/if}

{#if householdModalCatId}
	<Modal title="Foyer" onclose={() => (householdModalCatId = null)}>
		<HouseholdMembersPanel catId={householdModalCatId} currentUserId={data.currentUserId} />
	</Modal>
{/if}
