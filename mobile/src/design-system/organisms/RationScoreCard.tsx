import { View, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ScoreRation } from '@shared/nutrition';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Badge, type BadgeVariant } from '../atoms/Badge';
import { colors, spacing } from '../tokens';

interface RationScoreCardProps {
	score: ScoreRation;
	/** Appelé quand l'utilisateur tape une action dont `href` pointe vers un autre écran (ex. "/aliments"). */
	onNavigateToHref?: (href: string) => void;
}

const niveauVariant: Record<ScoreRation['niveau'], BadgeVariant> = {
	excellent: 'success',
	bon: 'success',
	correct: 'primary',
	a_ameliorer: 'warning',
	insuffisant: 'destructive'
};

const axeStatutVariant: Record<'ok' | 'attention' | 'probleme', BadgeVariant> = {
	ok: 'success',
	attention: 'warning',
	probleme: 'destructive'
};

const impactVariant: Record<'fort' | 'moyen' | 'faible', BadgeVariant> = {
	fort: 'destructive',
	moyen: 'warning',
	faible: 'default'
};

export function RationScoreCard({ score, onNavigateToHref }: RationScoreCardProps) {
	return (
		<Card style={{ gap: spacing.md }}>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
				<View
					style={{
						width: 72,
						height: 72,
						borderRadius: 999,
						borderWidth: 6,
						borderColor: colors.primary,
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<Text variant="title">{score.score}</Text>
				</View>
				<View style={{ flex: 1, gap: 2 }}>
					<Badge label={score.titre} variant={niveauVariant[score.niveau]} />
					<Text style={{ marginTop: spacing.xs }}>{score.verdict}</Text>
				</View>
			</View>

			<View style={{ gap: spacing.sm }}>
				{score.axes.map((axe) => (
					<View key={axe.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
						<Text color="muted" style={{ flex: 1 }}>
							{axe.resume}
						</Text>
						<Badge label={`${axe.points}/${axe.pointsMax}`} variant={axeStatutVariant[axe.statut]} />
					</View>
				))}
			</View>

			{score.actions.length > 0 ? (
				<View style={{ gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
					{score.actions.map((action) => {
						const Wrapper = action.href && onNavigateToHref ? Pressable : View;
						return (
							<Wrapper
								key={action.id}
								onPress={action.href && onNavigateToHref ? () => onNavigateToHref(action.href!) : undefined}
								style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
							>
								<Badge label={action.impact} variant={impactVariant[action.impact]} />
								<View style={{ flex: 1 }}>
									<Text variant="bodyMedium">{action.titre}</Text>
									<Text variant="caption" color="muted">
										{action.detail}
									</Text>
								</View>
								{action.href && onNavigateToHref ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
							</Wrapper>
						);
					})}
				</View>
			) : null}
		</Card>
	);
}
