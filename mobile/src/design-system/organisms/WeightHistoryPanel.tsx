import { useState } from 'react';
import { View } from 'react-native';
import type { TendancePoids } from '@shared/catWeight';
import { Text } from '../atoms/Text';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { Spinner } from '../atoms/Spinner';
import { FormField } from '../molecules/FormField';
import { Alert } from '../molecules/Alert';
import { colors, spacing } from '../tokens';
import { useAddWeightLog, useWeightHistory } from '../../api/catWeight';
import { ApiError } from '../../api/client';

const tendanceLabels: Record<TendancePoids, string> = { HAUSSE: 'En hausse', BAISSE: 'En baisse', STABLE: 'Stable' };

interface WeightHistoryPanelProps {
	catId: string;
}

export function WeightHistoryPanel({ catId }: WeightHistoryPanelProps) {
	const { data, isLoading } = useWeightHistory(catId);
	const addWeightLog = useAddWeightLog(catId);
	const [weightKg, setWeightKg] = useState('');
	const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit() {
		setError(null);
		const parsed = Number(weightKg);
		if (!Number.isFinite(parsed) || parsed <= 0) {
			setError('Le poids doit être un nombre supérieur à 0.');
			return;
		}
		try {
			await addWeightLog.mutateAsync({ weightKg: parsed, recordedAt });
			setWeightKg('');
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Impossible d'enregistrer la pesée.");
		}
	}

	return (
		<View style={{ gap: spacing.lg }}>
			<Text variant="caption" color="muted">
				Le DER calculé est un point de départ, pas une prescription figée. Repesez régulièrement votre chat pour
				vérifier que la ration suit bien l'objectif — la pratique vétérinaire usuelle est de juger la trajectoire
				après 2-3 semaines.
			</Text>

			<View style={{ flexDirection: 'row', gap: spacing.sm }}>
				<View style={{ flex: 1 }}>
					<FormField label="Poids (kg)">
						<Input value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
					</FormField>
				</View>
				<View style={{ flex: 1 }}>
					<FormField label="Date">
						<Input value={recordedAt} onChangeText={setRecordedAt} placeholder="AAAA-MM-JJ" />
					</FormField>
				</View>
			</View>
			{error ? <Alert variant="error" message={error} /> : null}
			<Button label="Enregistrer la pesée" onPress={handleSubmit} loading={addWeightLog.isPending} fullWidth />

			{isLoading ? (
				<Spinner />
			) : (
				<>
					{data?.evaluation.tendance ? (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
							<Text>Tendance sur la période :</Text>
							<Badge label={tendanceLabels[data.evaluation.tendance]} />
							{data.evaluation.pctVariation !== null ? (
								<Text variant="caption" color="muted">
									({data.evaluation.pctVariation > 0 ? '+' : ''}
									{data.evaluation.pctVariation.toFixed(1)}%)
								</Text>
							) : null}
						</View>
					) : null}

					{data?.evaluation.suggestion ? <Alert variant="warning" message={data.evaluation.suggestion} /> : null}

					{data && data.historique.length > 0 ? (
						<View style={{ gap: spacing.xs }}>
							{[...data.historique].reverse().map((pesee) => (
								<View key={pesee.id} style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.xs }}>
									<Text variant="caption" color="muted">
										{new Date(pesee.recordedAt).toLocaleDateString('fr-FR')}
									</Text>
									<Text variant="bodyMedium">{pesee.weightKg.toFixed(2)} kg</Text>
								</View>
							))}
						</View>
					) : (
						<Text color="muted">Aucune pesée enregistrée pour l'instant.</Text>
					)}
				</>
			)}
		</View>
	);
}
