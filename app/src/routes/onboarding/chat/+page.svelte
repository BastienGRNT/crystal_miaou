<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		CAT_ACTIVITY_LEVEL_VALUES,
		CAT_SEX_VALUES,
		CAT_SPECIAL_CONDITION_VALUES,
		validateCatOnboardingInput,
		type CatActivityLevel,
		type CatOnboardingInput,
		type CatSex,
		type CatSpecialCondition
	} from '$lib/domain/cat.calc';
	import AuthCard from '$lib/components/organisms/AuthCard.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import RadioGroup from '$lib/components/molecules/RadioGroup.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Select from '$lib/components/atoms/Select.svelte';
	import Checkbox from '$lib/components/atoms/Checkbox.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';

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

	const ageModeOptions = [
		{ value: 'birthDate', label: 'Date de naissance' },
		{ value: 'age', label: 'Âge (années)' }
	];

	let name = $state('');
	let weightKg = $state('');
	let ageMode = $state<'birthDate' | 'age'>('birthDate');
	let birthDate = $state('');
	let ageYears = $state('');
	let sex = $state<CatSex>('male');
	let sterilized = $state(false);
	let activityLevel = $state<CatActivityLevel>('modere');
	let hasOutdoorAccess = $state(false);
	let specialCondition = $state<CatSpecialCondition>('aucune');

	let errors = $state<Partial<Record<keyof CatOnboardingInput, string>>>({});
	let submitError = $state<string | null>(null);
	let loading = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitError = null;

		const input: CatOnboardingInput = {
			name,
			weightKg: Number(weightKg),
			birthDate: ageMode === 'birthDate' && birthDate ? birthDate : null,
			ageYears: ageMode === 'age' && ageYears !== '' ? Number(ageYears) : null,
			sex,
			sterilized,
			activityLevel,
			hasOutdoorAccess,
			specialCondition
		};

		const validation = validateCatOnboardingInput(input);
		errors = validation.errors;

		if (!validation.valid) {
			return;
		}

		loading = true;

		const response = await fetch('/api/cats', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});

		loading = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			errors = body.errors ?? {};
			submitError = 'Impossible de créer le profil du chat.';
			return;
		}

		await goto('/');
	}
</script>

<AuthCard
	title="Profil de votre chat"
	subtitle="Renseignez ces informations pour calculer ses besoins nutritionnels."
	maxWidth="md"
	onsubmit={handleSubmit}
>
	<Alert variant="info" title="Un point de départ, pas une prescription">
		Le calcul donne une base théorique à comparer au dosage conseillé sur le paquet. Suivez le poids
		réel de votre chat dans les semaines qui suivent et ajustez avec votre vétérinaire si besoin,
		surtout si votre chat a un contexte particulier (jeune, convalescence, opération à venir...).
	</Alert>

	<FormField label="Nom" for="name" error={errors.name}>
		<Input id="name" type="text" bind:value={name} autocomplete="off" />
	</FormField>

	<FormField label="Poids (kg)" for="weightKg" error={errors.weightKg}>
		<Input id="weightKg" type="number" step="0.01" min="0" bind:value={weightKg} />
	</FormField>

	<div class="flex flex-col gap-2">
		<RadioGroup name="ageMode" legend="Date de naissance ou âge" options={ageModeOptions} bind:value={ageMode} />

		{#if ageMode === 'birthDate'}
			<Input type="date" bind:value={birthDate} />
		{:else}
			<Input type="number" step="0.5" min="0" bind:value={ageYears} />
		{/if}
		{#if errors.birthDate}<span class="text-sm text-destructive">{errors.birthDate}</span>{/if}
		{#if errors.ageYears}<span class="text-sm text-destructive">{errors.ageYears}</span>{/if}
	</div>

	<FormField label="Sexe" for="sex">
		<Select id="sex" bind:value={sex}>
			{#each CAT_SEX_VALUES as value (value)}
				<option {value}>{sexLabels[value]}</option>
			{/each}
		</Select>
	</FormField>

	<Checkbox bind:checked={sterilized}>Stérilisé(e)</Checkbox>

	<FormField label="Niveau d'activité" for="activityLevel">
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

	<FormField label="Condition particulière" for="specialCondition">
		<Select id="specialCondition" bind:value={specialCondition}>
			{#each CAT_SPECIAL_CONDITION_VALUES as value (value)}
				<option {value}>{conditionLabels[value]}</option>
			{/each}
		</Select>
	</FormField>

	{#if submitError}<Alert variant="danger">{submitError}</Alert>{/if}

	<Button type="submit" block disabled={loading}>
		{#if loading}<Spinner />{/if}
		{loading ? 'Création...' : 'Créer le profil'}
	</Button>
</AuthCard>
