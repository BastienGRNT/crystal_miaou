import { View } from 'react-native';
import { Flame, Drumstick, Beef, Fish, Container, Hand } from 'lucide-react-native';
import type { RepartitionOkResponse } from '@shared/repartition';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Progress } from '../atoms/Progress';
import { colors, radii, spacing } from '../tokens';

interface RationSummaryCardProps {
	repartition: RepartitionOkResponse;
}

const foodTypeIcon = { croquette: Drumstick, patee: Beef, friandise: Fish } as const;

export function RationSummaryCard({ repartition }: RationSummaryCardProps) {
	const progressionPct = repartition.der > 0 ? Math.min(100, Math.round((repartition.ration.totalKcal / repartition.der) * 100)) : 0;

	const foodIdsEmEstimee = new Set(repartition.ration.fiabiliteParAliment.filter((a) => a.emEstimee).map((a) => a.foodId));
	const typeReposeSurEmEstimee = (type: keyof typeof foodTypeIcon) =>
		repartition.repas.some((r) => r.foodType === type && foodIdsEmEstimee.has(r.food.id));

	const totaux = repartition.totauxParType;

	return (
		<Card style={{ gap: spacing.md }}>
			<View style={{ gap: spacing.sm }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
					<View
						style={{
							width: 40,
							height: 40,
							borderRadius: radii.md,
							backgroundColor: colors.primaryMuted,
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>
						<Flame size={20} color={colors.primary} />
					</View>
					<View style={{ flex: 1 }}>
						<Text>
							<Text variant="heading" style={{ fontSize: 20 }}>
								{Math.round(repartition.ration.totalKcal)}
							</Text>
							<Text color="muted"> / {Math.round(repartition.der)} kcal</Text>
						</Text>
						<Text variant="caption" color="muted">
							({progressionPct}%) — RER {Math.round(repartition.rer)} kcal, facteur {repartition.facteurDER}
						</Text>
					</View>
				</View>
				<Progress positionPct={progressionPct} />
			</View>

			<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' }}>
				<Text variant="caption" style={{ textTransform: 'uppercase' }}>
					Total du jour
				</Text>
				{(['croquette', 'patee', 'friandise'] as const).map((type) => {
					if (totaux[type] <= 0) return null;
					const Icon = foodTypeIcon[type];
					return (
						<View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
							<Icon size={16} color={colors.mutedForeground} />
							<Text variant="caption" color="muted">
								{Math.round(totaux[type])} g{typeReposeSurEmEstimee(type) ? '*' : ''}
							</Text>
						</View>
					);
				})}
			</View>

			{repartition.recapCroquette && repartition.recapCroquette.distributeurAutomatiqueG > 0 ? (
				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' }}>
					<Text variant="caption" style={{ textTransform: 'uppercase' }}>
						Croquette — qui distribue quoi
					</Text>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
						<Container size={16} color={colors.mutedForeground} />
						<Text variant="caption" color="muted">
							{Math.round(repartition.recapCroquette.distributeurAutomatiqueG)} g déjà dans le distributeur
						</Text>
					</View>
					{repartition.recapCroquette.aPreparerG > 0 ? (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
							<Hand size={16} color={colors.mutedForeground} />
							<Text variant="caption" color="muted">
								{Math.round(repartition.recapCroquette.aPreparerG)} g à préparer vous-même
							</Text>
						</View>
					) : null}
				</View>
			) : null}
		</Card>
	);
}
