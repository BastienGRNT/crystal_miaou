import { useState } from 'react';
import { View } from 'react-native';
import type { Cat } from '@shared/cat';
import type { Food } from '@shared/food';
import type { DailyPlan } from '@shared/dailyPlan';
import { Disclosure } from '../molecules/Disclosure';
import { FormField } from '../molecules/FormField';
import { Select, type SelectOption } from '../atoms/Select';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Alert } from '../molecules/Alert';
import { Text } from '../atoms/Text';
import { spacing } from '../tokens';
import { usePatchCatFoodSelection } from '../../api/cats';
import { useActivateDailyPlan } from '../../api/dailyPlans';

interface FoodSelectionProps {
	cat: Cat;
	foods: Food[];
	dailyPlans: DailyPlan[];
	onNavigateToHref?: (href: string) => void;
}

function foodLabel(food: Food): string {
	return `${food.name} (${food.brand})`;
}

const NONE = '__none__';

export function FoodSelection({ cat, foods, dailyPlans, onNavigateToHref }: FoodSelectionProps) {
	const croquettes = foods.filter((f) => f.type === 'croquette');
	const patees = foods.filter((f) => f.type === 'patee');
	const friandises = foods.filter((f) => f.type === 'friandise');

	const [croquetteFoodId, setCroquetteFoodId] = useState(cat.activeCroquetteFoodId ?? NONE);
	const [pateeFoodId, setPateeFoodId] = useState(cat.activePateeFoodId ?? NONE);
	const [friandiseFoodId, setFriandiseFoodId] = useState(cat.activeFriandiseFoodId ?? NONE);
	const [friandiseQuantiteTotaleG, setFriandiseQuantiteTotaleG] = useState(
		cat.friandiseQuantiteTotaleG !== null ? String(cat.friandiseQuantiteTotaleG) : ''
	);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const patchFoodSelection = usePatchCatFoodSelection(cat.id);
	const activateDailyPlan = useActivateDailyPlan(cat.id);

	const activeDailyPlanId = dailyPlans.find((plan) => plan.isActive)?.id ?? NONE;
	const aucunAlimentPrincipal = croquetteFoodId === NONE && pateeFoodId === NONE;

	const noms = [croquetteFoodId, pateeFoodId, friandiseFoodId]
		.map((id) => foods.find((f) => f.id === id)?.name)
		.filter((nom): nom is string => Boolean(nom));
	const routineActive = dailyPlans.find((plan) => plan.isActive)?.name;
	const resumeSelection =
		noms.length === 0
			? 'Aucun aliment choisi pour le moment.'
			: routineActive
				? `${noms.join(' · ')} — routine ${routineActive}`
				: noms.join(' · ');

	function toOptions(list: Food[]): SelectOption<string>[] {
		return [{ label: 'Aucune', value: NONE }, ...list.map((f) => ({ label: foodLabel(f), value: f.id }))];
	}

	async function handleSubmit() {
		setError(null);
		setSaved(false);

		if (croquetteFoodId === NONE && pateeFoodId === NONE) {
			setError('Choisissez au moins une pâtée ou une croquette.');
			return;
		}

		try {
			await patchFoodSelection.mutateAsync({
				croquetteFoodId: croquetteFoodId === NONE ? null : croquetteFoodId,
				pateeFoodId: pateeFoodId === NONE ? null : pateeFoodId,
				friandiseFoodId: friandiseFoodId === NONE ? null : friandiseFoodId,
				friandiseQuantiteTotaleG: friandiseFoodId !== NONE ? Number(friandiseQuantiteTotaleG) : null
			});
			setSaved(true);
		} catch {
			setError("Impossible d'enregistrer.");
		}
	}

	return (
		<Disclosure title="Ce que mange ce chat en ce moment" defaultOpen={aucunAlimentPrincipal}>
			<Text variant="caption" color="muted">
				{resumeSelection}
			</Text>

			<FormField label="Routine active">
				{dailyPlans.length === 0 ? (
					<Text
						variant="caption"
						color="primary"
						onPress={() => onNavigateToHref?.('/repas/routines')}
					>
						Aucune routine pour ce chat. Créez-en une pour définir les heures des repas.
					</Text>
				) : (
					<>
						<Select
							value={activeDailyPlanId}
							options={dailyPlans.map((plan) => ({ label: plan.name, value: plan.id }))}
							onChange={(planId) => activateDailyPlan.mutate(planId)}
						/>
						<Text variant="caption" color="primary" onPress={() => onNavigateToHref?.('/repas/routines')}>
							Gérer les routines (heures, créneaux).
						</Text>
					</>
				)}
			</FormField>

			<FormField label="Croquette">
				<Select value={croquetteFoodId} options={toOptions(croquettes)} onChange={setCroquetteFoodId} />
				{croquettes.length === 0 ? (
					<Text variant="caption" color="muted">
						Aucune croquette dans le catalogue.
					</Text>
				) : null}
			</FormField>

			<FormField label="Pâtée">
				<Select value={pateeFoodId} options={toOptions(patees)} onChange={setPateeFoodId} />
				{patees.length === 0 ? (
					<Text variant="caption" color="muted">
						Aucune pâtée dans le catalogue.
					</Text>
				) : null}
			</FormField>

			<FormField label="Friandise (optionnel)">
				<Select value={friandiseFoodId} options={toOptions(friandises)} onChange={setFriandiseFoodId} />
			</FormField>

			{friandiseFoodId !== NONE ? (
				<FormField label="Quantité de friandise par jour (g)">
					<Input
						keyboardType="numeric"
						value={friandiseQuantiteTotaleG}
						onChangeText={setFriandiseQuantiteTotaleG}
					/>
				</FormField>
			) : null}

			{error ? <Alert variant="error" message={error} /> : null}
			{saved ? <Alert variant="success" message="Enregistré." /> : null}

			<View>
				<Button label="Enregistrer" onPress={handleSubmit} loading={patchFoodSelection.isPending} fullWidth />
			</View>
		</Disclosure>
	);
}
