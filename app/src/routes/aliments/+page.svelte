<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		FOOD_LEGAL_STATUS_VALUES,
		FOOD_TYPE_VALUES,
		resolveFoodEnergyValues,
		resolveFoodHumidity,
		validateFoodInput,
		type FoodInput,
		type FoodLegalStatus,
		type FoodType
	} from '$lib/domain/food.calc';
	import Card from '$lib/components/atoms/Card.svelte';
	import Badge from '$lib/components/atoms/Badge.svelte';
	import Button from '$lib/components/atoms/Button.svelte';
	import Input from '$lib/components/atoms/Input.svelte';
	import Select from '$lib/components/atoms/Select.svelte';
	import Spinner from '$lib/components/atoms/Spinner.svelte';
	import FormField from '$lib/components/molecules/FormField.svelte';
	import Modal from '$lib/components/molecules/Modal.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import Tabs from '$lib/components/molecules/Tabs.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';
	import EmptyState from '$lib/components/molecules/EmptyState.svelte';
	import LabelScanUpload from '$lib/components/molecules/LabelScanUpload.svelte';
	import type { ParsedFoodLabel } from '$lib/domain/ocr.calc';
	import Plus from '@lucide/svelte/icons/plus';
	import Wheat from '@lucide/svelte/icons/wheat';
	import Beef from '@lucide/svelte/icons/beef';
	import Drumstick from '@lucide/svelte/icons/drumstick';
	import Fish from '@lucide/svelte/icons/fish';

	interface FoodRecord {
		id: string;
		name: string;
		brand: string;
		type: FoodType;
		emKcal100g: string;
		emEstimee: boolean;
		emSuspecte: boolean;
		packageSizeG: string | null;
		doseDistributeurG: string | null;
		proteinesG100g: string;
		lipidesG100g: string;
		humiditeG100g: string;
		humiditeEstimee: boolean;
		fibresG100g: string;
		cendresG100g: string;
		glucidesG100g: string;
		glucidesEstimes: boolean;
		calciumG100g: string | null;
		phosphoreG100g: string | null;
		taurineG100g: string | null;
		statutLegal: FoodLegalStatus;
	}

	let { data }: { data: { foods: FoodRecord[] } } = $props();

	const typeLabels: Record<FoodType, string> = {
		croquette: 'Croquettes',
		patee: 'Pâtée',
		friandise: 'Friandise'
	};

	const legalStatusLabels: Record<FoodLegalStatus, string> = {
		complet: 'Complet',
		complementaire: 'Complémentaire'
	};

	let typeFilter = $state<'all' | FoodType>('all');

	const filteredFoods = $derived(
		typeFilter === 'all' ? data.foods : data.foods.filter((f) => f.type === typeFilter)
	);

	const filterTabs = [
		{ value: 'all' as const, label: 'Tous' },
		...FOOD_TYPE_VALUES.map((value) => ({ value, label: typeLabels[value] }))
	];

	const foodTypeIcon: Record<FoodType, typeof Beef> = {
		croquette: Drumstick,
		patee: Beef,
		friandise: Fish
	};

	let showModal = $state(false);
	let editingFoodId = $state<string | null>(null);

	let name = $state('');
	let brand = $state('');
	let type = $state<FoodType>('croquette');
	let emKcal100g = $state('');
	let packageSizeG = $state('');
	let doseDistributeurG = $state('');
	let proteinesG100g = $state('');
	let lipidesG100g = $state('');
	let humiditeG100g = $state('');
	let fibresG100g = $state('');
	let cendresG100g = $state('');
	let glucidesG100g = $state('');
	let calciumG100g = $state('');
	let phosphoreG100g = $state('');
	let taurineG100g = $state('');
	let statutLegal = $state<FoodLegalStatus>('complet');

	let errors = $state<Partial<Record<keyof FoodInput, string>>>({});
	let submitError = $state<string | null>(null);
	let loading = $state(false);
	let scanWarnings = $state<string[]>([]);
	let hasScanned = $state(false);

	const atwaterPreview = $derived.by(() => {
		const proteinesNum = Number(proteinesG100g);
		const lipidesNum = Number(lipidesG100g);
		const fibresNum = Number(fibresG100g);
		const cendresNum = Number(cendresG100g);

		if (
			!Number.isFinite(proteinesNum) ||
			!Number.isFinite(lipidesNum) ||
			!Number.isFinite(fibresNum) ||
			!Number.isFinite(cendresNum)
		) {
			return null;
		}

		const humiditeResolue = resolveFoodHumidity(type, humiditeG100g === '' ? null : Number(humiditeG100g));

		return {
			...resolveFoodEnergyValues({
				emKcal100g: emKcal100g === '' ? null : Number(emKcal100g),
				proteinesG100g: proteinesNum,
				lipidesG100g: lipidesNum,
				humiditeG100g: humiditeResolue.humiditeG100g,
				fibresG100g: fibresNum,
				cendresG100g: cendresNum,
				glucidesG100g: glucidesG100g === '' ? null : Number(glucidesG100g)
			}),
			humiditeResolue: humiditeResolue.humiditeG100g,
			humiditeEstimee: humiditeResolue.humiditeEstimee
		};
	});

	function resetForm() {
		editingFoodId = null;
		name = '';
		brand = '';
		type = 'croquette';
		emKcal100g = '';
		packageSizeG = '';
		doseDistributeurG = '';
		proteinesG100g = '';
		lipidesG100g = '';
		humiditeG100g = '';
		fibresG100g = '';
		cendresG100g = '';
		glucidesG100g = '';
		calciumG100g = '';
		phosphoreG100g = '';
		taurineG100g = '';
		statutLegal = 'complet';
		errors = {};
		submitError = null;
		scanWarnings = [];
		hasScanned = false;
	}

	function handleScanned({ parsed }: { rawText: string; parsed: ParsedFoodLabel }) {
		if (parsed.name.value) name = parsed.name.value;
		if (parsed.type.value) type = parsed.type.value;
		if (parsed.statutLegal.value) statutLegal = parsed.statutLegal.value;
		if (parsed.emKcal100g.value !== null) emKcal100g = String(parsed.emKcal100g.value);
		if (parsed.proteinesG100g.value !== null) proteinesG100g = String(parsed.proteinesG100g.value);
		if (parsed.lipidesG100g.value !== null) lipidesG100g = String(parsed.lipidesG100g.value);
		if (parsed.humiditeG100g.value !== null) humiditeG100g = String(parsed.humiditeG100g.value);
		if (parsed.fibresG100g.value !== null) fibresG100g = String(parsed.fibresG100g.value);
		if (parsed.cendresG100g.value !== null) cendresG100g = String(parsed.cendresG100g.value);
		if (parsed.glucidesG100g.value !== null) glucidesG100g = String(parsed.glucidesG100g.value);
		scanWarnings = parsed.warnings;
		hasScanned = true;
	}

	function openCreateModal() {
		resetForm();
		showModal = true;
	}

	function openEditModal(food: FoodRecord) {
		editingFoodId = food.id;
		name = food.name;
		brand = food.brand;
		type = food.type;
		emKcal100g = food.emKcal100g;
		packageSizeG = food.packageSizeG ?? '';
		doseDistributeurG = food.doseDistributeurG ?? '';
		proteinesG100g = food.proteinesG100g;
		lipidesG100g = food.lipidesG100g;
		// Vide (pas la valeur stockée) si c'était une estimation générique : sinon la ré-enregistrer sans
		// y toucher la ferait passer pour une valeur confirmée par le fabricant.
		humiditeG100g = food.humiditeEstimee ? '' : food.humiditeG100g;
		fibresG100g = food.fibresG100g;
		cendresG100g = food.cendresG100g;
		glucidesG100g = food.glucidesG100g;
		calciumG100g = food.calciumG100g ?? '';
		phosphoreG100g = food.phosphoreG100g ?? '';
		taurineG100g = food.taurineG100g ?? '';
		statutLegal = food.statutLegal;
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

		const input: FoodInput = {
			name,
			brand,
			type,
			emKcal100g: emKcal100g === '' ? null : Number(emKcal100g),
			packageSizeG: packageSizeG === '' ? null : Number(packageSizeG),
			doseDistributeurG: doseDistributeurG === '' ? null : Number(doseDistributeurG),
			proteinesG100g: Number(proteinesG100g),
			lipidesG100g: Number(lipidesG100g),
			humiditeG100g: humiditeG100g === '' ? null : Number(humiditeG100g),
			fibresG100g: Number(fibresG100g),
			cendresG100g: Number(cendresG100g),
			glucidesG100g: glucidesG100g === '' ? null : Number(glucidesG100g),
			calciumG100g: calciumG100g === '' ? null : Number(calciumG100g),
			phosphoreG100g: phosphoreG100g === '' ? null : Number(phosphoreG100g),
			taurineG100g: taurineG100g === '' ? null : Number(taurineG100g),
			statutLegal
		};

		const validation = validateFoodInput(input);
		errors = validation.errors;

		if (!validation.valid) {
			return;
		}

		loading = true;

		const response = await fetch(editingFoodId ? `/api/foods/${editingFoodId}` : '/api/foods', {
			method: editingFoodId ? 'PATCH' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(input)
		});

		loading = false;

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			errors = body.errors ?? {};
			submitError = "Impossible d'enregistrer l'aliment.";
			return;
		}

		showModal = false;
		await invalidateAll();
	}

	async function handleDelete(food: FoodRecord) {
		if (!confirm(`Supprimer "${food.name}" ?`)) return;

		await fetch(`/api/foods/${food.id}`, { method: 'DELETE' });
		await invalidateAll();
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:py-10">
	<PageHeader title="Aliments" subtitle="Catalogue des produits pour vos chats.">
		{#snippet action()}
			<Button onclick={openCreateModal}><Plus />Ajouter</Button>
		{/snippet}
	</PageHeader>

	<Alert variant="info" class="mb-4">
		Saisissez ce qui est imprimé sur le paquet : protéines, lipides, fibres et cendres suffisent. Ces
		quatre valeurs sont obligatoires sur toute étiquette UE, donc toujours disponibles — l'app en
		déduit l'énergie avec l'équation NRC 2006, celle des guides FEDIAF. Les champs optionnels
		affinent le résultat quand vous les avez, sans jamais être nécessaires. Voir
		<a href="/comprendre" class="underline">Comprendre le calcul</a>.
	</Alert>

	<Tabs class="mb-4" items={filterTabs} value={typeFilter} onchange={(v) => (typeFilter = v)} />

	<div class="flex flex-col gap-3">
		{#each filteredFoods as food (food.id)}
			{@const Icon = foodTypeIcon[food.type]}
			<Card>
				{#snippet header()}
					<div class="flex items-center gap-2.5">
						<span class="flex size-9 items-center justify-center rounded-lg bg-primary-muted text-primary">
							<Icon class="size-4.5" />
						</span>
						<div>
							<h3 class="text-[17px] leading-tight">{food.name}</h3>
							<p class="text-sm text-muted-foreground">{food.brand} · {typeLabels[food.type]}</p>
						</div>
					</div>
					<div class="flex flex-col items-end gap-1">
						<Badge>{Number(food.emKcal100g).toFixed(0)} kcal/100g</Badge>
						{#if food.statutLegal === 'complementaire'}
							<Badge variant="warning">Complémentaire</Badge>
						{/if}
						{#if food.humiditeEstimee}
							<Badge variant="warning">Humidité à vérifier</Badge>
						{/if}
						{#if food.emEstimee}
							<Badge variant="warning">EM estimée</Badge>
						{:else if food.emSuspecte}
							<Badge variant="warning">EM à vérifier</Badge>
						{/if}
						{#if food.glucidesEstimes}
							<Badge variant="warning">Glucides estimés</Badge>
						{/if}
					</div>
				{/snippet}
				<div class="flex gap-2">
					<Button variant="secondary" size="sm" onclick={() => openEditModal(food)}>Modifier</Button>
					<Button variant="secondary" size="sm" onclick={() => handleDelete(food)}>Supprimer</Button>
				</div>
			</Card>
		{:else}
			<EmptyState icon={Wheat} title="Aucun aliment" description="Ajoutez un premier aliment à votre catalogue." />
		{/each}
	</div>
</div>

{#if showModal}
	<Modal title={editingFoodId ? "Modifier l'aliment" : 'Ajouter un aliment'} onclose={closeModal}>
		<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
			{#if !editingFoodId}
				<LabelScanUpload onScanned={handleScanned} />
				{#if hasScanned}
					<Alert variant="info" title="Valeurs lues automatiquement — vérifie-les avant d'enregistrer.">
						{#if scanWarnings.length > 0}
							<ul class="list-disc pl-4">
								{#each scanWarnings as warning (warning)}
									<li>{warning}</li>
								{/each}
							</ul>
						{/if}
					</Alert>
				{/if}
			{/if}

			<FormField label="Nom" for="name" error={errors.name}>
				<Input id="name" type="text" bind:value={name} autocomplete="off" />
			</FormField>

			<FormField label="Marque" for="brand" error={errors.brand}>
				<Input id="brand" type="text" bind:value={brand} autocomplete="off" />
			</FormField>

			<FormField label="Type" for="type" error={errors.type}>
				<Select id="type" bind:value={type}>
					{#each FOOD_TYPE_VALUES as value (value)}
						<option {value}>{typeLabels[value]}</option>
					{/each}
				</Select>
			</FormField>

			{#if type === 'patee'}
				<FormField label="Poids du paquet (g)" for="packageSizeG" error={errors.packageSizeG}>
					<Input id="packageSizeG" type="number" step="0.5" min="0" bind:value={packageSizeG} />
				</FormField>
				<p class="text-sm text-muted-foreground">
					Permet de fractionner le paquet en parts égales entre les repas de la journée (1/2, 1/3...).
				</p>
			{/if}

			{#if type === 'croquette'}
				<FormField
					label="Poids d'une dose de distributeur (g, optionnel)"
					for="doseDistributeurG"
					error={errors.doseDistributeurG}
				>
					<Input id="doseDistributeurG" type="number" step="0.5" min="0" bind:value={doseDistributeurG} />
				</FormField>
				<p class="text-sm text-muted-foreground">
					Si un distributeur automatique donne cette croquette, indiquez le poids d'une dose/cup —
					le distributeur ne sait donner qu'un nombre entier de doses, pas une quantité libre au
					gramme près. Laissez vide si vous ne servez cette croquette qu'à la main.
				</p>
			{/if}

			<FormField label="Statut légal" for="statutLegal" error={errors.statutLegal}>
				<Select id="statutLegal" bind:value={statutLegal}>
					{#each FOOD_LEGAL_STATUS_VALUES as value (value)}
						<option {value}>{legalStatusLabels[value]}</option>
					{/each}
				</Select>
			</FormField>

			<FormField label="Protéines (g/100g)" for="proteinesG100g" error={errors.proteinesG100g}>
				<Input id="proteinesG100g" type="number" step="0.1" min="0" bind:value={proteinesG100g} />
			</FormField>

			<FormField label="Lipides (g/100g)" for="lipidesG100g" error={errors.lipidesG100g}>
				<Input id="lipidesG100g" type="number" step="0.1" min="0" bind:value={lipidesG100g} />
			</FormField>

			<FormField label="Humidité (g/100g, optionnel)" for="humiditeG100g" error={errors.humiditeG100g}>
				<Input id="humiditeG100g" type="number" step="0.1" min="0" bind:value={humiditeG100g} />
			</FormField>
			<p class="text-sm text-muted-foreground">
				Pas légalement obligatoire sur l'étiquette en dessous de 14% (donc quasi jamais indiquée pour
				une croquette sèche) — laissez vide si vous ne l'avez pas, l'app utilisera une valeur
				générique par type d'aliment et l'affichera avec un badge "à vérifier".
			</p>
			{#if atwaterPreview?.humiditeEstimee}
				<p class="text-sm text-muted-foreground">
					Valeur utilisée : {atwaterPreview.humiditeResolue}% — générique, pas celle du fabricant.
				</p>
			{/if}

			<FormField label="Fibres brutes (g/100g)" for="fibresG100g" error={errors.fibresG100g}>
				<Input id="fibresG100g" type="number" step="0.1" min="0" bind:value={fibresG100g} />
			</FormField>
			<p class="text-sm text-muted-foreground">Obligatoire sur une étiquette UE — toujours présente.</p>

			<FormField label="Cendres brutes (g/100g)" for="cendresG100g" error={errors.cendresG100g}>
				<Input id="cendresG100g" type="number" step="0.1" min="0" bind:value={cendresG100g} />
			</FormField>
			<p class="text-sm text-muted-foreground">Obligatoire sur une étiquette UE — toujours présente.</p>

			<FormField label="Glucides (g/100g, optionnel)" for="glucidesG100g" error={errors.glucidesG100g}>
				<Input id="glucidesG100g" type="number" step="0.1" min="0" bind:value={glucidesG100g} />
			</FormField>
			{#if atwaterPreview?.glucidesEstimees}
				<p class="text-sm text-muted-foreground">
					Estimé par différence : {atwaterPreview.glucidesG100g.toFixed(1)} g/100g — estimé, non
					garanti par le fabricant.
				</p>
			{/if}

			<FormField label="Calcium (g/100g, optionnel)" for="calciumG100g" error={errors.calciumG100g}>
				<Input id="calciumG100g" type="number" step="0.01" min="0" bind:value={calciumG100g} />
			</FormField>

			<FormField label="Phosphore (g/100g, optionnel)" for="phosphoreG100g" error={errors.phosphoreG100g}>
				<Input id="phosphoreG100g" type="number" step="0.01" min="0" bind:value={phosphoreG100g} />
			</FormField>

			<FormField label="Taurine (g/100g, optionnel)" for="taurineG100g" error={errors.taurineG100g}>
				<Input id="taurineG100g" type="number" step="0.01" min="0" bind:value={taurineG100g} />
			</FormField>
			<p class="text-sm text-muted-foreground">
				Calcium, phosphore et taurine sont rarement indiqués sur une étiquette grand public. Sans ces
				valeurs, l'app ne peut pas vérifier ces points — cherchez-les sur la fiche technique du
				fabricant si votre chat a une condition qui les rend importants (croissance, insuffisance
				rénale...).
			</p>

			<FormField label="Énergie métabolisable (kcal/100g, optionnel)" for="emKcal100g" error={errors.emKcal100g}>
				<Input id="emKcal100g" type="number" step="0.1" min="0" bind:value={emKcal100g} />
			</FormField>
			{#if atwaterPreview?.emEstimee}
				<Alert variant="info" title="Laissez vide si vous ne trouvez pas — c'est prévu">
					Cette valeur n'est pas obligatoire sur un emballage en UE : la plupart des paquets ne
					l'indiquent pas. Sans elle, l'app la calcule à partir de l'analyse nutritionnelle ci-dessus
					avec l'équation NRC 2006 (la méthode des guides FEDIAF et des calculateurs vétérinaires) :
					<strong>{atwaterPreview.emKcal100g.toFixed(0)} kcal/100g</strong>. C'est fiable à quelques
					pourcents près et parfaitement utilisable au quotidien. Ne saisissez une valeur ici que si
					le fabricant l'indique noir sur blanc — une valeur inventée serait pire que l'estimation.
				</Alert>
			{/if}

			{#if submitError}<Alert variant="danger">{submitError}</Alert>{/if}

			<Button type="submit" block disabled={loading}>
				{#if loading}<Spinner />{/if}
				{loading ? 'Enregistrement...' : 'Enregistrer'}
			</Button>
		</form>
	</Modal>
{/if}
