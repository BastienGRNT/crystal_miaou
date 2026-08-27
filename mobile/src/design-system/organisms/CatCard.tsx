import { View } from 'react-native';
import { Cat as CatIcon, Venus, Mars } from 'lucide-react-native';
import type { Cat, CatActivityLevel, CatDerAjustementPct, CatSex, CatSpecialCondition } from '@shared/cat';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { colors, radii, spacing } from '../tokens';
import { usePatchCatDerAjustement } from '../../api/cats';

const activityLabels: Record<CatActivityLevel, string> = { faible: 'Faible', modere: 'Modéré', eleve: 'Élevé' };
const conditionLabels: Record<CatSpecialCondition, string> = {
	aucune: 'Aucune',
	gestation: 'Gestation',
	croissance: 'Croissance',
	surpoids: 'Surpoids'
};
const sexLabels: Record<CatSex, string> = { male: 'Mâle', femelle: 'Femelle' };

/** Formatage d'affichage pur : `ageMonths` vient de l'API (CLAUDE.md règle 9), jamais recalculé ici. */
function ageLabel(ageMonths: number | null | undefined): string {
	if (ageMonths === null || ageMonths === undefined) return 'Âge inconnu';
	const years = Math.floor(ageMonths / 12);
	return years >= 1 ? `${years} an${years > 1 ? 's' : ''}` : `${ageMonths} mois`;
}

function derAjustementLabel(value: number): string {
	if (value === 0) return 'Normal';
	return `${value > 0 ? '+' : ''}${value}%`;
}

interface CatCardProps {
	cat: Cat;
	derAjustementPctValeurs: CatDerAjustementPct[];
	onEdit: () => void;
	onWeightHistory: () => void;
	onHousehold: () => void;
}

export function CatCard({ cat, derAjustementPctValeurs, onEdit, onWeightHistory, onHousehold }: CatCardProps) {
	const patchDerAjustement = usePatchCatDerAjustement(cat.id);

	return (
		<Card style={{ gap: spacing.md }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
				<View
					style={{
						width: 44,
						height: 44,
						borderRadius: radii.full,
						backgroundColor: colors.primaryMuted,
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<CatIcon size={22} color={colors.primary} />
				</View>
				<View style={{ flex: 1 }}>
					<Text variant="heading">{cat.name}</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
						{cat.sex === 'male' ? <Mars size={14} color={colors.mutedForeground} /> : <Venus size={14} color={colors.mutedForeground} />}
						<Text variant="caption" color="muted">
							{sexLabels[cat.sex]} · {ageLabel(cat.ageMonths)} · {cat.weightKg.toFixed(2)} kg
						</Text>
					</View>
				</View>
			</View>

			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
				<Badge label={`Activité ${activityLabels[cat.activityLevel].toLowerCase()}`} />
				<Badge label={cat.hasOutdoorAccess ? 'Accès extérieur' : 'Intérieur strict'} />
				{cat.specialCondition !== 'aucune' ? <Badge label={conditionLabels[cat.specialCondition]} variant="warning" /> : null}
			</View>

			<View style={{ gap: spacing.xs }}>
				<Text variant="caption" color="muted">
					Besoin ajusté (après suivi de poids)
				</Text>
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
					{derAjustementPctValeurs.map((value) => (
						<Button
							key={value}
							variant={cat.derAjustementPct === value ? 'primary' : 'secondary'}
							label={derAjustementLabel(value)}
							disabled={patchDerAjustement.isPending}
							onPress={() => patchDerAjustement.mutate(value)}
						/>
					))}
				</View>
				{patchDerAjustement.isError ? (
					<Text variant="caption" color="destructive">
						Impossible d'enregistrer l'ajustement, réessayez.
					</Text>
				) : null}
			</View>

			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
				<Button variant="secondary" label="Modifier" onPress={onEdit} />
				<Button variant="secondary" label="Suivi de poids" onPress={onWeightHistory} />
				<Button variant="secondary" label="Foyer" onPress={onHousehold} />
			</View>
		</Card>
	);
}
