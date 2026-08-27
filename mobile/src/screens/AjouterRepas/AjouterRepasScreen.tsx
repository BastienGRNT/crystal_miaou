import { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Search, Trash2 } from 'lucide-react-native';
import { PageHeader } from '../../design-system/molecules/PageHeader';
import { FormField } from '../../design-system/molecules/FormField';
import { Alert } from '../../design-system/molecules/Alert';
import { Card } from '../../design-system/atoms/Card';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { Button } from '../../design-system/atoms/Button';
import { Text } from '../../design-system/atoms/Text';
import { Spinner } from '../../design-system/atoms/Spinner';
import { IconButton } from '../../design-system/atoms/IconButton';
import { colors, spacing } from '../../design-system/tokens';
import { useCats } from '../../api/cats';
import { useFoods } from '../../api/foods';
import { useCreateMealEntry, useDeleteMealEntry, usePlannedMealEntries } from '../../api/mealEntries';
import { ApiError } from '../../api/client';

function nowLocalDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function nowLocalTime(): string {
	const now = new Date();
	return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function formatHeure(value: string): string {
	return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function AjouterRepasScreen() {
	const catsQuery = useCats();
	const foodsQuery = useFoods();
	const cats = catsQuery.data?.cats ?? [];
	const foods = foodsQuery.data ?? [];

	const [catId, setCatId] = useState<string | null>(null);
	const activeCatId = catId ?? (cats.length === 1 ? cats[0].id : null);
	const [foodQuery, setFoodQuery] = useState('');
	const [foodId, setFoodId] = useState<string | null>(null);
	const [date, setDate] = useState(nowLocalDate());
	const [time, setTime] = useState(nowLocalTime());
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const plannedQuery = usePlannedMealEntries(activeCatId ?? undefined, date);
	const createMealEntry = useCreateMealEntry();
	const deleteMealEntry = useDeleteMealEntry();

	const filteredFoods = foodQuery.trim()
		? foods.filter((f) => f.name.toLowerCase().includes(foodQuery.trim().toLowerCase()) || f.brand.toLowerCase().includes(foodQuery.trim().toLowerCase()))
		: foods;

	const selectedFood = foods.find((f) => f.id === foodId) ?? null;

	async function handleSubmit() {
		setError(null);
		setSuccess(null);

		if (!activeCatId || !foodId || !date || !time) {
			setError('Chat, aliment, date et heure sont requis.');
			return;
		}

		try {
			await createMealEntry.mutateAsync({
				catId: activeCatId,
				foodId,
				quantityG: null,
				consumedAt: new Date(`${date}T${time}:00`).toISOString()
			});
			setSuccess('Repas ajouté au journal.');
			setFoodQuery('');
			setFoodId(null);
			setDate(nowLocalDate());
			setTime(nowLocalTime());
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer le repas.");
		}
	}

	return (
		<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
			<PageHeader title="Ajouter un repas" subtitle="Enregistrez ce que votre chat a mangé." />

			{catsQuery.isLoading || foodsQuery.isLoading ? (
				<Spinner />
			) : cats.length === 0 ? (
				<Alert variant="info" message="Aucun chat enregistré. Créez d'abord un profil de chat depuis l'onglet Accueil." />
			) : foods.length === 0 ? (
				<Alert variant="info" message="Aucun aliment dans le catalogue. Ajoutez d'abord un aliment dans l'onglet Aliments." />
			) : (
				<>
					<Card style={{ gap: spacing.md }}>
						{cats.length > 1 ? (
							<FormField label="Chat">
								<Select value={activeCatId ?? ''} options={cats.map((c) => ({ label: c.name, value: c.id }))} onChange={setCatId} />
							</FormField>
						) : null}

						<FormField label="Aliment">
							<View style={{ position: 'relative' }}>
								<Input value={foodQuery} onChangeText={setFoodQuery} placeholder="Rechercher un aliment (nom, marque)..." />
								<Search size={16} color={colors.mutedForeground} style={{ position: 'absolute', right: spacing.md, top: 14 }} />
							</View>
						</FormField>

						<View style={{ maxHeight: 180, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
							<ScrollView>
								{filteredFoods.length === 0 ? (
									<Text variant="caption" color="muted" style={{ padding: spacing.sm }}>
										Aucun résultat.
									</Text>
								) : (
									filteredFoods.map((food) => (
										<Pressable
											key={food.id}
											onPress={() => setFoodId(food.id)}
											style={{
												flexDirection: 'row',
												justifyContent: 'space-between',
												padding: spacing.sm,
												backgroundColor: foodId === food.id ? colors.primaryMuted : 'transparent'
											}}
										>
											<Text color={foodId === food.id ? 'primary' : 'default'}>{food.name}</Text>
											<Text variant="caption" color="muted">
												{food.brand}
											</Text>
										</Pressable>
									))
								)}
							</ScrollView>
						</View>

						{selectedFood ? (
							<Text variant="caption" color="muted">
								Sélectionné : <Text variant="bodyMedium">{selectedFood.name}</Text> ({selectedFood.brand})
							</Text>
						) : null}

						<View style={{ flexDirection: 'row', gap: spacing.sm }}>
							<View style={{ flex: 1 }}>
								<FormField label="Date">
									<Input value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
								</FormField>
							</View>
							<View style={{ flex: 1 }}>
								<FormField label="Heure">
									<Input value={time} onChangeText={setTime} placeholder="HH:MM" />
								</FormField>
							</View>
						</View>

						{error ? <Alert variant="error" message={error} /> : null}
						{success ? <Alert variant="success" message={success} /> : null}

						<Button label="Ajouter le repas" onPress={handleSubmit} loading={createMealEntry.isPending} fullWidth />
					</Card>

					<Card style={{ gap: spacing.sm }}>
						<Text variant="heading">Repas planifiés ce jour-là</Text>
						{plannedQuery.isLoading ? (
							<Spinner />
						) : (plannedQuery.data ?? []).length === 0 ? (
							<Text variant="caption" color="muted">
								Aucun repas planifié pour l'instant.
							</Text>
						) : (
							(plannedQuery.data ?? []).map((meal) => (
								<View key={meal.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
									<Text variant="caption">
										<Text variant="bodyMedium">{formatHeure(meal.consumedAt)}</Text> — {meal.food.name} ({meal.food.brand})
									</Text>
									<IconButton onPress={() => deleteMealEntry.mutate(meal.id)}>
										<Trash2 size={16} color={colors.destructive} />
									</IconButton>
								</View>
							))
						)}
					</Card>
				</>
			)}
		</ScrollView>
	);
}
