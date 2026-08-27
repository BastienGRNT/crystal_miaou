import { useState } from 'react';
import { ScrollView, View, Alert as RNAlert } from 'react-native';
import { Wheat, Drumstick, Beef, Fish } from 'lucide-react-native';
import type { Food, FoodInput, FoodLegalStatus, FoodType } from '@shared/food';
import type { ParsedFoodLabel } from '@shared/ocr';
import { PageHeader } from '../../design-system/molecules/PageHeader';
import { EmptyState } from '../../design-system/molecules/EmptyState';
import { Modal } from '../../design-system/molecules/Modal';
import { FormField } from '../../design-system/molecules/FormField';
import { Alert } from '../../design-system/molecules/Alert';
import { Tabs } from '../../design-system/molecules/Tabs';
import { LabelScanUpload } from '../../design-system/molecules/LabelScanUpload';
import { Card } from '../../design-system/atoms/Card';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { Button } from '../../design-system/atoms/Button';
import { Badge } from '../../design-system/atoms/Badge';
import { Text } from '../../design-system/atoms/Text';
import { Spinner } from '../../design-system/atoms/Spinner';
import { colors, spacing } from '../../design-system/tokens';
import { useCreateFood, useDeleteFood, useFoods, useUpdateFood } from '../../api/foods';
import { ApiError } from '../../api/client';

const typeLabels: Record<FoodType, string> = { croquette: 'Croquettes', patee: 'Pâtée', friandise: 'Friandise' };
const legalStatusLabels: Record<FoodLegalStatus, string> = { complet: 'Complet', complementaire: 'Complémentaire' };
const foodTypeIcon = { croquette: Drumstick, patee: Beef, friandise: Fish } as const;

const EMPTY_FORM = {
	name: '',
	brand: '',
	type: 'croquette' as FoodType,
	emKcal100g: '',
	packageSizeG: '',
	doseDistributeurG: '',
	proteinesG100g: '',
	lipidesG100g: '',
	humiditeG100g: '',
	fibresG100g: '',
	cendresG100g: '',
	glucidesG100g: '',
	calciumG100g: '',
	phosphoreG100g: '',
	taurineG100g: '',
	statutLegal: 'complet' as FoodLegalStatus
};

type FormState = typeof EMPTY_FORM;

function foodToForm(food: Food): FormState {
	return {
		name: food.name,
		brand: food.brand,
		type: food.type,
		emKcal100g: food.emKcal100g !== null ? String(food.emKcal100g) : '',
		packageSizeG: food.packageSizeG !== null ? String(food.packageSizeG) : '',
		doseDistributeurG: food.doseDistributeurG !== null ? String(food.doseDistributeurG) : '',
		proteinesG100g: String(food.proteinesG100g),
		lipidesG100g: String(food.lipidesG100g),
		// Vide (pas la valeur stockée) si c'était une estimation générique : sinon la ré-enregistrer sans y
		// toucher la ferait passer pour une valeur confirmée par le fabricant.
		humiditeG100g: food.humiditeEstimee ? '' : (food.humiditeG100g?.toString() ?? ''),
		fibresG100g: String(food.fibresG100g),
		cendresG100g: String(food.cendresG100g),
		glucidesG100g: food.glucidesEstimes ? '' : (food.glucidesG100g?.toString() ?? ''),
		calciumG100g: food.calciumG100g !== null ? String(food.calciumG100g) : '',
		phosphoreG100g: food.phosphoreG100g !== null ? String(food.phosphoreG100g) : '',
		taurineG100g: food.taurineG100g !== null ? String(food.taurineG100g) : '',
		statutLegal: food.statutLegal
	};
}

function toInput(form: FormState): FoodInput {
	const n = (v: string) => (v === '' ? null : Number(v));
	return {
		name: form.name,
		brand: form.brand,
		type: form.type,
		emKcal100g: n(form.emKcal100g),
		packageSizeG: n(form.packageSizeG),
		doseDistributeurG: n(form.doseDistributeurG),
		proteinesG100g: Number(form.proteinesG100g),
		lipidesG100g: Number(form.lipidesG100g),
		humiditeG100g: n(form.humiditeG100g),
		fibresG100g: Number(form.fibresG100g),
		cendresG100g: Number(form.cendresG100g),
		glucidesG100g: n(form.glucidesG100g),
		calciumG100g: n(form.calciumG100g),
		phosphoreG100g: n(form.phosphoreG100g),
		taurineG100g: n(form.taurineG100g),
		statutLegal: form.statutLegal
	};
}

function FoodForm({ editingFood, onDone }: { editingFood: Food | null; onDone: () => void }) {
	const [form, setForm] = useState<FormState>(editingFood ? foodToForm(editingFood) : EMPTY_FORM);
	const [error, setError] = useState<string | null>(null);
	const [scanWarnings, setScanWarnings] = useState<string[]>([]);
	const [hasScanned, setHasScanned] = useState(false);
	const createFood = useCreateFood();
	const updateFood = useUpdateFood(editingFood?.id ?? '');
	const saving = createFood.isPending || updateFood.isPending;

	function set<K extends keyof FormState>(key: K, value: FormState[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	function handleScanned(parsed: ParsedFoodLabel) {
		if (parsed.name.value) set('name', parsed.name.value);
		if (parsed.type.value) set('type', parsed.type.value);
		if (parsed.statutLegal.value) set('statutLegal', parsed.statutLegal.value);
		if (parsed.emKcal100g.value !== null) set('emKcal100g', String(parsed.emKcal100g.value));
		if (parsed.proteinesG100g.value !== null) set('proteinesG100g', String(parsed.proteinesG100g.value));
		if (parsed.lipidesG100g.value !== null) set('lipidesG100g', String(parsed.lipidesG100g.value));
		if (parsed.humiditeG100g.value !== null) set('humiditeG100g', String(parsed.humiditeG100g.value));
		if (parsed.fibresG100g.value !== null) set('fibresG100g', String(parsed.fibresG100g.value));
		if (parsed.cendresG100g.value !== null) set('cendresG100g', String(parsed.cendresG100g.value));
		if (parsed.glucidesG100g.value !== null) set('glucidesG100g', String(parsed.glucidesG100g.value));
		setScanWarnings(parsed.warnings);
		setHasScanned(true);
	}

	async function handleSubmit() {
		setError(null);
		if (!form.name.trim() || !form.brand.trim() || !form.proteinesG100g || !form.lipidesG100g || !form.fibresG100g || !form.cendresG100g) {
			setError('Nom, marque, protéines, lipides, fibres et cendres sont obligatoires.');
			return;
		}
		try {
			const input = toInput(form);
			if (editingFood) await updateFood.mutateAsync(input);
			else await createFood.mutateAsync(input);
			onDone();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer l'aliment.");
		}
	}

	return (
		<View style={{ gap: spacing.lg }}>
			{!editingFood ? (
				<>
					<LabelScanUpload onScanned={(result) => handleScanned(result.parsed)} />
					{hasScanned ? (
						<Alert
							variant="info"
							message={`Valeurs lues automatiquement — vérifie-les avant d'enregistrer.${scanWarnings.length > 0 ? ' ' + scanWarnings.join(' ') : ''}`}
						/>
					) : null}
				</>
			) : null}

			<FormField label="Nom">
				<Input value={form.name} onChangeText={(v) => set('name', v)} />
			</FormField>
			<FormField label="Marque">
				<Input value={form.brand} onChangeText={(v) => set('brand', v)} />
			</FormField>
			<FormField label="Type">
				<Select
					value={form.type}
					options={(['croquette', 'patee', 'friandise'] as const).map((v) => ({ label: typeLabels[v], value: v }))}
					onChange={(v) => set('type', v)}
				/>
			</FormField>

			{form.type === 'patee' ? (
				<FormField label="Poids du paquet (g)">
					<Input value={form.packageSizeG} onChangeText={(v) => set('packageSizeG', v)} keyboardType="decimal-pad" />
				</FormField>
			) : null}

			{form.type === 'croquette' ? (
				<FormField label="Poids d'une dose de distributeur (g, optionnel)">
					<Input value={form.doseDistributeurG} onChangeText={(v) => set('doseDistributeurG', v)} keyboardType="decimal-pad" />
				</FormField>
			) : null}

			<FormField label="Statut légal">
				<Select
					value={form.statutLegal}
					options={(['complet', 'complementaire'] as const).map((v) => ({ label: legalStatusLabels[v], value: v }))}
					onChange={(v) => set('statutLegal', v)}
				/>
			</FormField>

			<FormField label="Protéines (g/100g)">
				<Input value={form.proteinesG100g} onChangeText={(v) => set('proteinesG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Lipides (g/100g)">
				<Input value={form.lipidesG100g} onChangeText={(v) => set('lipidesG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Humidité (g/100g, optionnel)">
				<Input value={form.humiditeG100g} onChangeText={(v) => set('humiditeG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<Text variant="caption" color="muted">
				Pas légalement obligatoire en dessous de 14% — laissez vide si vous ne l'avez pas, l'app utilisera une
				valeur générique par type d'aliment.
			</Text>

			<FormField label="Fibres brutes (g/100g)">
				<Input value={form.fibresG100g} onChangeText={(v) => set('fibresG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Cendres brutes (g/100g)">
				<Input value={form.cendresG100g} onChangeText={(v) => set('cendresG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Glucides (g/100g, optionnel)">
				<Input value={form.glucidesG100g} onChangeText={(v) => set('glucidesG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Calcium (g/100g, optionnel)">
				<Input value={form.calciumG100g} onChangeText={(v) => set('calciumG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Phosphore (g/100g, optionnel)">
				<Input value={form.phosphoreG100g} onChangeText={(v) => set('phosphoreG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Taurine (g/100g, optionnel)">
				<Input value={form.taurineG100g} onChangeText={(v) => set('taurineG100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<Text variant="caption" color="muted">
				Calcium, phosphore et taurine sont rarement indiqués sur une étiquette grand public.
			</Text>

			<FormField label="Énergie métabolisable (kcal/100g, optionnel)">
				<Input value={form.emKcal100g} onChangeText={(v) => set('emKcal100g', v)} keyboardType="decimal-pad" />
			</FormField>
			<Alert
				variant="info"
				message="Laissez vide si vous ne trouvez pas — l'app la calcule automatiquement (équation NRC 2006) et l'affiche avec un badge une fois enregistré."
			/>

			{error ? <Alert variant="error" message={error} /> : null}

			<Button label="Enregistrer" onPress={handleSubmit} loading={saving} fullWidth />
		</View>
	);
}

export function AlimentsScreen() {
	const [typeFilter, setTypeFilter] = useState<'all' | FoodType>('all');
	const foodsQuery = useFoods(typeFilter === 'all' ? undefined : typeFilter);
	const deleteFood = useDeleteFood();
	const [showModal, setShowModal] = useState(false);
	const [editingFood, setEditingFood] = useState<Food | null>(null);

	function openCreateModal() {
		setEditingFood(null);
		setShowModal(true);
	}

	function openEditModal(food: Food) {
		setEditingFood(food);
		setShowModal(true);
	}

	function handleDelete(food: Food) {
		RNAlert.alert('Supprimer cet aliment ?', `"${food.name}" sera définitivement supprimé.`, [
			{ text: 'Annuler', style: 'cancel' },
			{ text: 'Supprimer', style: 'destructive', onPress: () => deleteFood.mutate(food.id) }
		]);
	}

	const foods = foodsQuery.data ?? [];

	return (
		<>
			<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
				<PageHeader title="Aliments" subtitle="Catalogue des produits pour vos chats." right={<Button label="Ajouter" onPress={openCreateModal} />} />

				<Alert
					variant="info"
					message="Saisissez ce qui est imprimé sur le paquet : protéines, lipides, fibres et cendres suffisent (obligatoires sur toute étiquette UE). L'app en déduit l'énergie avec l'équation NRC 2006."
				/>

				<Tabs
					value={typeFilter}
					options={[
						{ label: 'Tous', value: 'all' },
						{ label: 'Croquettes', value: 'croquette' },
						{ label: 'Pâtée', value: 'patee' },
						{ label: 'Friandise', value: 'friandise' }
					]}
					onChange={setTypeFilter}
				/>

				{foodsQuery.isLoading ? (
					<Spinner />
				) : foods.length === 0 ? (
					<EmptyState icon={Wheat} title="Aucun aliment" description="Ajoutez un premier aliment à votre catalogue." />
				) : (
					foods.map((food) => {
						const Icon = foodTypeIcon[food.type];
						return (
							<Card key={food.id} style={{ gap: spacing.md }}>
								<View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
									<View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
										<Icon size={18} color={colors.primary} />
									</View>
									<View style={{ flex: 1 }}>
										<Text variant="heading">{food.name}</Text>
										<Text variant="caption" color="muted">
											{food.brand} · {typeLabels[food.type]}
										</Text>
									</View>
									<View style={{ alignItems: 'flex-end', gap: 4 }}>
										<Badge label={`${(food.emKcal100g ?? 0).toFixed(0)} kcal/100g`} />
										{food.statutLegal === 'complementaire' ? <Badge label="Complémentaire" variant="warning" /> : null}
										{food.humiditeEstimee ? <Badge label="Humidité à vérifier" variant="warning" /> : null}
										{food.emEstimee ? (
											<Badge label="EM estimée" variant="warning" />
										) : food.emSuspecte ? (
											<Badge label="EM à vérifier" variant="warning" />
										) : null}
										{food.glucidesEstimes ? <Badge label="Glucides estimés" variant="warning" /> : null}
									</View>
								</View>
								<View style={{ flexDirection: 'row', gap: spacing.sm }}>
									<Button variant="secondary" label="Modifier" onPress={() => openEditModal(food)} />
									<Button variant="secondary" label="Supprimer" onPress={() => handleDelete(food)} />
								</View>
							</Card>
						);
					})
				)}
			</ScrollView>

			<Modal visible={showModal} onClose={() => setShowModal(false)} title={editingFood ? "Modifier l'aliment" : 'Ajouter un aliment'}>
				<FoodForm editingFood={editingFood} onDone={() => setShowModal(false)} />
			</Modal>
		</>
	);
}
