import { useState } from 'react';
import { View } from 'react-native';
import type { CatActivityLevel, CatOnboardingInput, CatSex, CatSpecialCondition } from '@shared/cat';
import { AuthCard } from '../../design-system/organisms/AuthCard';
import { FormField } from '../../design-system/molecules/FormField';
import { Input } from '../../design-system/atoms/Input';
import { Select } from '../../design-system/atoms/Select';
import { Checkbox } from '../../design-system/atoms/Checkbox';
import { Button } from '../../design-system/atoms/Button';
import { Alert } from '../../design-system/molecules/Alert';
import { Tabs } from '../../design-system/molecules/Tabs';
import { Text } from '../../design-system/atoms/Text';
import { spacing } from '../../design-system/tokens';
import { apiPost, ApiError } from '../../api/client';
import type { Cat } from '@shared/cat';
import { useQueryClient } from '@tanstack/react-query';

const activityLabels: Record<CatActivityLevel, string> = { faible: 'Faible', modere: 'Modéré', eleve: 'Élevé' };
const conditionLabels: Record<CatSpecialCondition, string> = {
	aucune: 'Aucune',
	gestation: 'Gestation',
	croissance: 'Croissance',
	surpoids: 'Surpoids'
};
const sexLabels: Record<CatSex, string> = { male: 'Mâle', femelle: 'Femelle' };

export function OnboardingScreen({ onCreated }: { onCreated: () => void }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState('');
	const [weightKg, setWeightKg] = useState('');
	const [ageMode, setAgeMode] = useState<'birthDate' | 'age'>('birthDate');
	const [birthDate, setBirthDate] = useState('');
	const [ageYears, setAgeYears] = useState('');
	const [sex, setSex] = useState<CatSex>('male');
	const [sterilized, setSterilized] = useState(false);
	const [activityLevel, setActivityLevel] = useState<CatActivityLevel>('modere');
	const [hasOutdoorAccess, setHasOutdoorAccess] = useState(false);
	const [specialCondition, setSpecialCondition] = useState<CatSpecialCondition>('aucune');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		setError(null);

		if (!name.trim() || !weightKg) {
			setError('Le nom et le poids sont requis.');
			return;
		}

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

		setLoading(true);
		try {
			await apiPost<{ cat: Cat }>('/api/cats', input);
			await queryClient.invalidateQueries({ queryKey: ['cats'] });
			onCreated();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Impossible de créer le profil du chat.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthCard title="Profil de votre chat" subtitle="Renseignez ces informations pour calculer ses besoins nutritionnels.">
			<Alert
				variant="info"
				message="Un point de départ, pas une prescription : suivez le poids réel de votre chat dans les semaines qui suivent et ajustez avec votre vétérinaire si besoin."
			/>

			<FormField label="Nom">
				<Input value={name} onChangeText={setName} />
			</FormField>

			<FormField label="Poids (kg)">
				<Input value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
			</FormField>

			<FormField label="Date de naissance ou âge">
				<Tabs
					value={ageMode}
					options={[
						{ label: 'Date de naissance', value: 'birthDate' },
						{ label: 'Âge (années)', value: 'age' }
					]}
					onChange={setAgeMode}
				/>
				<View style={{ marginTop: spacing.sm }}>
					{ageMode === 'birthDate' ? (
						<Input value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-JJ" />
					) : (
						<Input value={ageYears} onChangeText={setAgeYears} keyboardType="decimal-pad" placeholder="Ex. 3" />
					)}
				</View>
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

			<View style={{ gap: spacing.xs }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
					<Checkbox checked={hasOutdoorAccess} onChange={setHasOutdoorAccess} />
					<Text>A accès à l'extérieur</Text>
				</View>
				<Text variant="caption" color="muted">
					Un chat d'intérieur strict dépense moins d'énergie qu'un chat qui sort, même avec le même niveau
					d'activité perçu — ça influence le calcul.
				</Text>
			</View>

			<FormField label="Condition particulière">
				<Select
					value={specialCondition}
					options={(['aucune', 'gestation', 'croissance', 'surpoids'] as const).map((v) => ({
						label: conditionLabels[v],
						value: v
					}))}
					onChange={setSpecialCondition}
				/>
			</FormField>

			{error ? <Alert variant="error" message={error} /> : null}

			<Button label={loading ? 'Création...' : 'Créer le profil'} onPress={handleSubmit} loading={loading} fullWidth />
		</AuthCard>
	);
}
