import { View } from 'react-native';
import { ChartLine, Beef, Drumstick, Fish } from 'lucide-react-native';
import type { AnalyseOkResponse, JourAnalyse, StatutJourAnalyse } from '@shared/analyse';
import type { RepartitionFoodType } from '@shared/repartition';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { EmptyState } from '../molecules/EmptyState';
import { colors, spacing } from '../tokens';

const ECHELLE_MAX_PCT = 150;

const barColor: Record<StatutJourAnalyse, string> = {
	OK: colors.success,
	DEFICIT: colors.destructive,
	EXCES: colors.warning,
	SANS_DONNEE: colors.muted
};

function barHeightPct(jour: JourAnalyse): number {
	if (jour.statut === 'SANS_DONNEE') return 4;
	return Math.max(4, Math.min(100, (jour.pctDER / ECHELLE_MAX_PCT) * 100));
}

function formatDateCourte(isoDate: string): string {
	return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const foodTypeIcon = { croquette: Drumstick, patee: Beef, friandise: Fish } as const;
const foodTypeLabel: Record<RepartitionFoodType, string> = { croquette: 'Croquette', patee: 'Pâtée', friandise: 'Friandise' };

interface AnalyseEvolutionProps {
	analyse: AnalyseOkResponse;
}

export function AnalyseEvolution({ analyse }: AnalyseEvolutionProps) {
	const joursAvecDonnee = analyse.jours.some((j) => j.statut !== 'SANS_DONNEE');

	if (!joursAvecDonnee) {
		return <EmptyState icon={ChartLine} title="Pas encore de données" description="L'analyse se remplira au fil des jours renseignés." />;
	}

	return (
		<View style={{ gap: spacing.lg }}>
			<Card style={{ gap: spacing.sm }}>
				<Text variant="heading">Apport calorique quotidien vs besoin (DER)</Text>

				<View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 140 }}>
					{analyse.jours.map((jour) => (
						<View key={jour.date} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
							<View style={{ height: `${barHeightPct(jour)}%`, backgroundColor: barColor[jour.statut], borderRadius: 3, minHeight: 4 }} />
						</View>
					))}
				</View>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
					<Text variant="caption" color="muted">
						{formatDateCourte(analyse.jours[0].date)}
					</Text>
					<Text variant="caption" color="muted">
						{formatDateCourte(analyse.jours[analyse.jours.length - 1].date)}
					</Text>
				</View>

				<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
					{(
						[
							['Conforme (±10% du DER)', colors.success],
							['Déficit', colors.destructive],
							['Excès', colors.warning],
							['Sans donnée', colors.muted]
						] as const
					).map(([label, color]) => (
						<View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
							<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
							<Text variant="caption" color="muted">
								{label}
							</Text>
						</View>
					))}
				</View>
			</Card>

			<View style={{ flexDirection: 'row', gap: spacing.md }}>
				<Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
					<Text variant="title" color="primary" style={{ fontSize: 28 }}>
						{analyse.moyennePctDER !== null ? `${analyse.moyennePctDER}%` : '—'}
					</Text>
					<Text variant="caption" color="muted">
						Apport moyen / DER
					</Text>
				</Card>
				<Card style={{ flex: 1, alignItems: 'center', gap: 2 }}>
					<Text variant="title" color="secondary" style={{ fontSize: 28 }}>
						{analyse.tauxConformitePct !== null ? `${analyse.tauxConformitePct}%` : '—'}
					</Text>
					<Text variant="caption" color="muted">
						Jours conformes
					</Text>
				</Card>
			</View>

			<Card style={{ gap: spacing.sm }}>
				<Text variant="heading">Répartition moyenne par jour</Text>
				{(Object.entries(analyse.moyenneGrammesParType) as [RepartitionFoodType, number][])
					.filter(([, grammes]) => grammes > 0)
					.map(([type, grammes]) => {
						const Icon = foodTypeIcon[type];
						return (
							<View key={type} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
									<Icon size={16} color={colors.mutedForeground} />
									<Text>{foodTypeLabel[type]}</Text>
								</View>
								<Text variant="bodyMedium">{grammes.toFixed(0)} g/j</Text>
							</View>
						);
					})}
				<Text variant="caption" color="muted">
					DER de référence actuel du chat : {Math.round(analyse.der)} kcal/j (RER {Math.round(analyse.rer)} kcal).
				</Text>
			</Card>
		</View>
	);
}
