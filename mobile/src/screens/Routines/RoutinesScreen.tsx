import { useState } from 'react';
import { ScrollView, View, Alert as RNAlert } from 'react-native';
import { CalendarClock, Clock, Trash2 } from 'lucide-react-native';
import type { DailyPlan, DailyPlanSlotDistributionMode, DailyPlanSlotFoodType } from '@shared/dailyPlan';
import { PageHeader } from '../../design-system/molecules/PageHeader';
import { EmptyState } from '../../design-system/molecules/EmptyState';
import { Modal } from '../../design-system/molecules/Modal';
import { FormField } from '../../design-system/molecules/FormField';
import { Alert } from '../../design-system/molecules/Alert';
import { Tabs } from '../../design-system/molecules/Tabs';
import { Card } from '../../design-system/atoms/Card';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { Button } from '../../design-system/atoms/Button';
import { Badge } from '../../design-system/atoms/Badge';
import { Text } from '../../design-system/atoms/Text';
import { Spinner } from '../../design-system/atoms/Spinner';
import { IconButton } from '../../design-system/atoms/IconButton';
import { colors, spacing } from '../../design-system/tokens';
import { useCats } from '../../api/cats';
import { useActivateDailyPlan, useCreateDailyPlan, useDailyPlans, useDeleteDailyPlan, useUpdateDailyPlan } from '../../api/dailyPlans';
import { ApiError } from '../../api/client';

const foodTypeLabels: Record<DailyPlanSlotFoodType, string> = { croquette: 'Croquette', patee: 'Pâtée', friandise: 'Friandise' };
const distributionModeLabels: Record<DailyPlanSlotDistributionMode, string> = {
	gamelle: 'Gamelle',
	distributeur_automatique: 'Distributeur automatique',
	gamelle_ludique: 'Gamelle ludique'
};

interface SlotDraft {
	timeOfDay: string;
	foodType: DailyPlanSlotFoodType;
	distributionMode: DailyPlanSlotDistributionMode;
}

/** Étale les heures par défaut entre 08:00 et 20:00, purement pour pré-remplir le formulaire — un
 * confort de saisie, pas une règle nutritionnelle (l'utilisateur modifie librement chaque heure avant
 * d'enregistrer). */
function heureParDefaut(index: number, count: number): string {
	if (count <= 1) return '08:00';
	const minutesDebut = 8 * 60;
	const minutesFin = 20 * 60;
	const minutes = minutesDebut + Math.round(((minutesFin - minutesDebut) * index) / (count - 1));
	const heures = Math.floor(minutes / 60).toString().padStart(2, '0');
	const reste = (minutes % 60).toString().padStart(2, '0');
	return `${heures}:${reste}`;
}

function defaultSlots(count: number): SlotDraft[] {
	return Array.from({ length: count }, (_, i) => ({ timeOfDay: heureParDefaut(i, count), foodType: 'croquette', distributionMode: 'gamelle' }));
}

function RoutineForm({ catId, editingPlan, onDone }: { catId: string; editingPlan: DailyPlan | null; onDone: () => void }) {
	const createPlan = useCreateDailyPlan(catId);
	const updatePlan = useUpdateDailyPlan(catId);
	const [name, setName] = useState(editingPlan?.name ?? '');
	const [slots, setSlots] = useState<SlotDraft[]>(
		editingPlan ? editingPlan.slots.map((s) => ({ timeOfDay: s.timeOfDay, foodType: s.foodType, distributionMode: s.distributionMode })) : defaultSlots(2)
	);
	const [error, setError] = useState<string | null>(null);
	const saving = createPlan.isPending || updatePlan.isPending;

	function updateSlot(index: number, patch: Partial<SlotDraft>) {
		setSlots((s) => s.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
	}

	function addSlot() {
		setSlots((s) => [...s, { timeOfDay: heureParDefaut(s.length, s.length + 1), foodType: 'croquette', distributionMode: 'gamelle' }]);
	}

	function removeSlot(index: number) {
		setSlots((s) => s.filter((_, i) => i !== index));
	}

	async function handleSubmit() {
		setError(null);
		if (!name.trim() || slots.length === 0) {
			setError('Le nom et au moins un créneau sont requis.');
			return;
		}
		try {
			const input = { catId, name, slots };
			if (editingPlan) await updatePlan.mutateAsync({ id: editingPlan.id, input });
			else await createPlan.mutateAsync(input);
			onDone();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer la routine.");
		}
	}

	return (
		<View style={{ gap: spacing.lg }}>
			<FormField label="Nom">
				<Input value={name} onChangeText={setName} placeholder="Semaine, Week-end..." />
			</FormField>

			<View style={{ gap: spacing.md }}>
				{slots.map((slot, i) => (
					<View key={i} style={{ gap: spacing.sm, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, padding: spacing.md }}>
						<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
							<Text variant="caption" color="muted" style={{ textTransform: 'uppercase' }}>
								Repas {i + 1}
							</Text>
							<IconButton onPress={() => removeSlot(i)}>
								<Trash2 size={16} color={colors.destructive} />
							</IconButton>
						</View>
						<FormField label="Heure">
							<Input value={slot.timeOfDay} onChangeText={(v) => updateSlot(i, { timeOfDay: v })} placeholder="HH:MM" />
						</FormField>
						<FormField label="Aliment">
							<Select
								value={slot.foodType}
								options={(['croquette', 'patee', 'friandise'] as const).map((v) => ({ label: foodTypeLabels[v], value: v }))}
								onChange={(v) => updateSlot(i, { foodType: v })}
							/>
						</FormField>
						<FormField label="Mode de distribution">
							<Select
								value={slot.distributionMode}
								options={(['gamelle', 'distributeur_automatique', 'gamelle_ludique'] as const).map((v) => ({ label: distributionModeLabels[v], value: v }))}
								onChange={(v) => updateSlot(i, { distributionMode: v })}
							/>
						</FormField>
					</View>
				))}
			</View>

			<Button variant="secondary" label="Ajouter un repas" onPress={addSlot} />

			{error ? <Alert variant="error" message={error} /> : null}
			<Button label="Enregistrer" onPress={handleSubmit} loading={saving} fullWidth />
		</View>
	);
}

export function RoutinesScreen() {
	const catsQuery = useCats();
	const cats = catsQuery.data?.cats ?? [];
	const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
	const activeCatId = selectedCatId ?? cats[0]?.id ?? null;

	const dailyPlansQuery = useDailyPlans(activeCatId ?? undefined);
	const activatePlan = useActivateDailyPlan(activeCatId ?? undefined);
	const deletePlan = useDeleteDailyPlan(activeCatId ?? undefined);

	const [showModal, setShowModal] = useState(false);
	const [editingPlan, setEditingPlan] = useState<DailyPlan | null>(null);

	function handleDelete(plan: DailyPlan) {
		RNAlert.alert('Supprimer cette routine ?', `"${plan.name}" sera définitivement supprimée.`, [
			{ text: 'Annuler', style: 'cancel' },
			{ text: 'Supprimer', style: 'destructive', onPress: () => deletePlan.mutate(plan.id) }
		]);
	}

	return (
		<>
			<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
				<PageHeader title="Routines" subtitle="Définissez le rythme des repas (heure et type d'aliment)." />

				{catsQuery.isLoading ? (
					<Spinner />
				) : cats.length === 0 ? (
					<Alert variant="info" message="Aucun chat enregistré. Créez d'abord un profil de chat depuis l'onglet Accueil." />
				) : (
					<>
						{cats.length > 1 ? (
							<Tabs value={activeCatId ?? ''} options={cats.map((cat) => ({ label: cat.name, value: cat.id }))} onChange={setSelectedCatId} />
						) : null}

						<Button
							label="Nouvelle routine"
							onPress={() => {
								setEditingPlan(null);
								setShowModal(true);
							}}
						/>

						{dailyPlansQuery.isLoading ? (
							<Spinner />
						) : (dailyPlansQuery.data ?? []).length === 0 ? (
							<EmptyState icon={CalendarClock} title="Aucune routine" description="Créez une routine pour planifier les repas de la journée." />
						) : (
							(dailyPlansQuery.data ?? []).map((plan) => (
								<Card key={plan.id} style={{ gap: spacing.sm }}>
									<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
										<View>
											<Text variant="heading">{plan.name}</Text>
											<Text variant="caption" color="muted">
												{plan.slots.length} repas/jour
											</Text>
										</View>
										{plan.isActive ? <Badge label="Active" variant="success" /> : null}
									</View>

									{plan.slots.map((slot) => (
										<View key={slot.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
											<Clock size={14} color={colors.mutedForeground} />
											<Text variant="caption" color="muted">
												<Text variant="bodyMedium">{slot.timeOfDay}</Text> — {foodTypeLabels[slot.foodType]} (
												{distributionModeLabels[slot.distributionMode]})
											</Text>
										</View>
									))}

									<View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
										{!plan.isActive ? <Button variant="secondary" label="Activer" onPress={() => activatePlan.mutate(plan.id)} /> : null}
										<Button
											variant="secondary"
											label="Modifier"
											onPress={() => {
												setEditingPlan(plan);
												setShowModal(true);
											}}
										/>
										<Button variant="secondary" label="Supprimer" onPress={() => handleDelete(plan)} />
									</View>
								</Card>
							))
						)}
					</>
				)}
			</ScrollView>

			<Modal visible={showModal} onClose={() => setShowModal(false)} title={editingPlan ? 'Modifier la routine' : 'Nouvelle routine'}>
				{activeCatId ? <RoutineForm catId={activeCatId} editingPlan={editingPlan} onDone={() => setShowModal(false)} /> : null}
			</Modal>
		</>
	);
}
