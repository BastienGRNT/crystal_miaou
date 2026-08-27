import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { Cat, CatActivityLevel, CatSex, CatSpecialCondition } from '@shared/cat';
import { PageHeader } from '../../design-system/molecules/PageHeader';
import { EmptyState } from '../../design-system/molecules/EmptyState';
import { Modal } from '../../design-system/molecules/Modal';
import { FormField } from '../../design-system/molecules/FormField';
import { Alert } from '../../design-system/molecules/Alert';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { Checkbox } from '../../design-system/atoms/Checkbox';
import { Button } from '../../design-system/atoms/Button';
import { Text } from '../../design-system/atoms/Text';
import { Spinner } from '../../design-system/atoms/Spinner';
import { CatCard } from '../../design-system/organisms/CatCard';
import { WeightHistoryPanel } from '../../design-system/organisms/WeightHistoryPanel';
import { HouseholdMembersPanel } from '../../design-system/organisms/HouseholdMembersPanel';
import { colors, spacing } from '../../design-system/tokens';
import { useCats, usePatchCatProfile } from '../../api/cats';
import { ApiError } from '../../api/client';
import { Cat as CatIcon } from 'lucide-react-native';

const activityLabels: Record<CatActivityLevel, string> = { faible: 'Faible', modere: 'Modéré', eleve: 'Élevé' };
const conditionLabels: Record<CatSpecialCondition, string> = {
	aucune: 'Aucune',
	gestation: 'Gestation',
	croissance: 'Croissance',
	surpoids: 'Surpoids'
};
const sexLabels: Record<CatSex, string> = { male: 'Mâle', femelle: 'Femelle' };

function EditCatForm({ cat, onDone }: { cat: Cat; onDone: () => void }) {
	const patchProfile = usePatchCatProfile(cat.id);
	const [name, setName] = useState(cat.name);
	const [weightKg, setWeightKg] = useState(String(cat.weightKg));
	const [birthDate, setBirthDate] = useState(cat.birthDate ?? '');
	const [sex, setSex] = useState<CatSex>(cat.sex);
	const [sterilized, setSterilized] = useState(cat.sterilized);
	const [activityLevel, setActivityLevel] = useState<CatActivityLevel>(cat.activityLevel);
	const [hasOutdoorAccess, setHasOutdoorAccess] = useState(cat.hasOutdoorAccess);
	const [specialCondition, setSpecialCondition] = useState<CatSpecialCondition>(cat.specialCondition);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit() {
		setError(null);
		if (!name.trim() || !weightKg || !birthDate) {
			setError('Le nom, le poids et la date de naissance sont requis.');
			return;
		}
		try {
			await patchProfile.mutateAsync({
				name,
				weightKg: Number(weightKg),
				birthDate,
				sex,
				sterilized,
				activityLevel,
				hasOutdoorAccess,
				specialCondition
			});
			onDone();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Impossible de mettre à jour le profil.');
		}
	}

	return (
		<View style={{ gap: spacing.lg }}>
			<FormField label="Nom">
				<Input value={name} onChangeText={setName} />
			</FormField>
			<FormField label="Poids (kg)">
				<Input value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
			</FormField>
			<FormField label="Date de naissance">
				<Input value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-JJ" />
			</FormField>
			<FormField label="Sexe">
				<Select
					value={sex}
					options={[
						{ label: sexLabels.male, value: 'male' },
						{ label: sexLabels.femelle, value: 'femelle' }
					]}
					onChange={setSex}
				/>
			</FormField>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
				<Checkbox checked={sterilized} onChange={setSterilized} />
				<Text>Stérilisé(e)</Text>
			</View>
			<FormField label="Niveau d'activité">
				<Select
					value={activityLevel}
					options={(['faible', 'modere', 'eleve'] as const).map((v) => ({ label: activityLabels[v], value: v }))}
					onChange={setActivityLevel}
				/>
			</FormField>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
				<Checkbox checked={hasOutdoorAccess} onChange={setHasOutdoorAccess} />
				<Text>A accès à l'extérieur</Text>
			</View>
			<FormField label="Condition particulière">
				<Select
					value={specialCondition}
					options={(['aucune', 'gestation', 'croissance', 'surpoids'] as const).map((v) => ({ label: conditionLabels[v], value: v }))}
					onChange={setSpecialCondition}
				/>
			</FormField>
			{error ? <Alert variant="error" message={error} /> : null}
			<Button label="Enregistrer" onPress={handleSubmit} loading={patchProfile.isPending} fullWidth />
		</View>
	);
}

export function ChatsScreen() {
	const catsQuery = useCats();
	const [editingCat, setEditingCat] = useState<Cat | null>(null);
	const [weightModalCatId, setWeightModalCatId] = useState<string | null>(null);
	const [householdModalCatId, setHouseholdModalCatId] = useState<string | null>(null);

	if (catsQuery.isLoading) {
		return (
			<View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
				<Spinner />
			</View>
		);
	}

	const cats = catsQuery.data?.cats ?? [];
	const derAjustementPctValeurs = catsQuery.data?.derAjustementPctValeurs ?? [];

	return (
		<>
			<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
				<PageHeader title="Mes chats" subtitle="Profils et besoins nutritionnels de vos chats." />

				{cats.length === 0 ? (
					<EmptyState icon={CatIcon} title="Aucun chat" description="Ajoutez le profil de votre premier chat depuis l'onglet Accueil." />
				) : (
					cats.map((cat) => (
						<CatCard
							key={cat.id}
							cat={cat}
							derAjustementPctValeurs={derAjustementPctValeurs}
							onEdit={() => setEditingCat(cat)}
							onWeightHistory={() => setWeightModalCatId(cat.id)}
							onHousehold={() => setHouseholdModalCatId(cat.id)}
						/>
					))
				)}
			</ScrollView>

			<Modal visible={editingCat !== null} onClose={() => setEditingCat(null)} title="Modifier le profil">
				{editingCat ? <EditCatForm cat={editingCat} onDone={() => setEditingCat(null)} /> : null}
			</Modal>

			<Modal visible={weightModalCatId !== null} onClose={() => setWeightModalCatId(null)} title="Suivi de poids">
				{weightModalCatId ? <WeightHistoryPanel catId={weightModalCatId} /> : null}
			</Modal>

			<Modal visible={householdModalCatId !== null} onClose={() => setHouseholdModalCatId(null)} title="Foyer">
				{householdModalCatId ? <HouseholdMembersPanel catId={householdModalCatId} /> : null}
			</Modal>
		</>
	);
}
