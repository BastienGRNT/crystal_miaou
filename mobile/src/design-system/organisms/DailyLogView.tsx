import { View } from 'react-native';
import { CalendarX, Flame, Drumstick, Beef, Fish } from 'lucide-react-native';
import type { DailyLogOkResponse, DailyLogEntry } from '@shared/dailyLog';
import type { NomNutrimentValide, StatutNutriment, SeuilNutriment } from '@shared/nutrition';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Badge, type BadgeVariant } from '../atoms/Badge';
import { Progress } from '../atoms/Progress';
import { Alert } from '../molecules/Alert';
import { EmptyState } from '../molecules/EmptyState';
import { colors, spacing } from '../tokens';

const foodTypeIcon = { croquette: Drumstick, patee: Beef, friandise: Fish } as const;

const nutrimentLabels: Record<NomNutrimentValide, string> = {
	proteines: 'Protéines',
	lipides: 'Lipides',
	calcium: 'Calcium',
	phosphore: 'Phosphore',
	taurine: 'Taurine',
	glucides: 'Glucides',
	ratioCalciumPhosphore: 'Ratio Ca:P'
};

const statutLabels: Record<StatutNutriment, string> = {
	OK: 'OK',
	DEFICIT: 'Déficit',
	EXCES: 'Excès',
	ATTENTION: 'À surveiller'
};

const statutBadgeVariant: Record<StatutNutriment, BadgeVariant> = {
	OK: 'success',
	DEFICIT: 'destructive',
	EXCES: 'warning',
	ATTENTION: 'warning'
};

const statutProgressColor: Record<StatutNutriment, string> = {
	OK: colors.success,
	DEFICIT: colors.destructive,
	EXCES: colors.warning,
	ATTENTION: colors.warning
};

const nutrimentUnite: Record<NomNutrimentValide, string> = {
	proteines: ' g/1000kcal',
	lipides: ' g/1000kcal',
	calcium: ' g/1000kcal',
	phosphore: ' g/1000kcal',
	taurine: ' g/1000kcal',
	glucides: ' % de matière sèche',
	ratioCalciumPhosphore: ''
};

function formatCible(nutriment: NomNutrimentValide, seuil: SeuilNutriment): string {
	const unite = nutrimentUnite[nutriment];
	if (seuil.min !== null && seuil.max !== null) return `cible ${seuil.min} – ${seuil.max}${unite}`;
	if (seuil.min !== null) return `cible ≥ ${seuil.min}${unite}`;
	if (seuil.max !== null) return `cible ≤ ${seuil.max}${unite}`;
	return 'pas de seuil strict';
}

/** Écart calculé côté API (`calculerRatioEcartSeuil`, nutrition.calc.ts) — jamais recalculé ici. */
function formatEcart(statut: { valeur: number; seuil: SeuilNutriment; ratioEcart: number | null }): string | null {
	if (statut.ratioEcart === null) return null;
	if (statut.seuil.max !== null && statut.valeur > statut.seuil.max) {
		return `${statut.ratioEcart.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}× la cible`;
	}
	return `à ${Math.round(statut.ratioEcart * 100)}% du minimum`;
}

function formatHeure(consumedAt: string): string {
	return new Date(consumedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatValeursEstimees(aliment: { emEstimee: boolean; humiditeEstimee: boolean; glucidesEstimes: boolean }): string {
	const flags: string[] = [];
	if (aliment.emEstimee) flags.push('EM');
	if (aliment.humiditeEstimee) flags.push('humidité');
	if (aliment.glucidesEstimes) flags.push('glucides');
	return flags.join(', ');
}

function formatQuantite(entry: DailyLogEntry): string {
	if (entry.foodType === 'patee' && entry.paquets !== null) {
		const paquets = entry.paquets;
		return `${paquets % 1 === 0 ? paquets : paquets.toFixed(1)} paquet${paquets > 1 ? 's' : ''} (${entry.quantiteG} g)`;
	}
	return `${entry.quantiteG} g`;
}

interface DailyLogViewProps {
	log: DailyLogOkResponse;
}

export function DailyLogView({ log }: DailyLogViewProps) {
	if (log.entries.length === 0) {
		return <EmptyState icon={CalendarX} title="Aucun repas ce jour-là" description="Rien n'a été enregistré pour cette journée." />;
	}

	const progressionPct = log.der > 0 ? Math.min(100, Math.round((log.ration.totalKcal / log.der) * 100)) : 0;
	const glucidesEnAttention = log.ration.statuts.some((s) => s.nutriment === 'glucides' && s.statut === 'ATTENTION');
	const aUnRatioADeplacer = log.ration.statuts.some((s) => s.statut !== 'OK');

	return (
		<View style={{ gap: spacing.lg }}>
			<Card style={{ gap: spacing.md }}>
				<Text variant="heading">Repas donnés ce jour-là</Text>
				{log.entries.map((entry) => {
					const Icon = foodTypeIcon[entry.foodType];
					return (
						<View
							key={entry.id}
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: spacing.sm,
								borderBottomWidth: 1,
								borderBottomColor: colors.border,
								paddingBottom: spacing.sm
							}}
						>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
								<View
									style={{
										width: 28,
										height: 28,
										borderRadius: 8,
										backgroundColor: colors.muted,
										alignItems: 'center',
										justifyContent: 'center'
									}}
								>
									<Icon size={14} color={colors.mutedForeground} />
								</View>
								<Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
									{formatHeure(entry.consumedAt)} — {entry.food.name} ({entry.food.brand})
								</Text>
							</View>
							<View style={{ flexDirection: 'row', gap: spacing.xs }}>
								<Badge label={formatQuantite(entry)} />
								<Badge label={entry.validated ? 'Donné' : 'Non donné'} variant={entry.validated ? 'success' : 'warning'} />
							</View>
						</View>
					);
				})}
			</Card>

			<Card style={{ gap: spacing.md }}>
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
					<View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
						<Flame size={18} color={colors.primary} />
					</View>
					<Text variant="heading">Résumé du jour</Text>
				</View>

				<View style={{ gap: spacing.sm }}>
					<Progress positionPct={progressionPct} />
					<Text variant="caption" color="muted">
						{Math.round(log.ration.totalKcal)} / {Math.round(log.der)} kcal ({progressionPct}%) — RER {Math.round(log.rer)} kcal
					</Text>
				</View>

				{log.ration.sousLeRER ? <Alert variant="error" message="Ce jour-là, la ration est descendue sous le RER de votre chat." /> : null}

				<View style={{ gap: spacing.md }}>
					{log.ration.statuts.map((statut) => {
						const ecart = formatEcart(statut);
						return (
							<View key={statut.nutriment} style={{ gap: spacing.xs }}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
									<Text>{nutrimentLabels[statut.nutriment]}</Text>
									<Badge
										label={`${statutLabels[statut.statut]} (${statut.valeur.toFixed(1)}${ecart ? ` — ${ecart}` : ''})`}
										variant={statutBadgeVariant[statut.statut]}
									/>
								</View>
								<Progress positionPct={statut.positionPct} color={statutProgressColor[statut.statut]} />
								<Text variant="caption" color="muted">
									{formatCible(statut.nutriment, statut.seuil)}
								</Text>
							</View>
						);
					})}
				</View>

				{log.ration.fiabiliteParAliment.length > 0 ? (
					<Alert
						variant="warning"
						message={`Valeurs partiellement estimées — ces aliments reposaient sur au moins une valeur estimée plutôt que déclarée par le fabricant : ${log.ration.fiabiliteParAliment
							.map((a) => `${a.foodName} (${formatValeursEstimees(a)})`)
							.join(', ')}.`}
					/>
				) : null}

				{aUnRatioADeplacer ? (
					<Alert
						variant="warning"
						message={
							"Baisser la ration ne corrige pas ces ratios : ils sont calculés par rapport aux calories, pas au poids donné. Pour corriger un déficit ou un excès, changez d'aliment ou ajustez la répartition croquette / pâtée." +
							(glucidesEnAttention && log.ration.glucidesParAliment.length > 0
								? ` ${log.ration.glucidesParAliment[0].foodName} tirait la ration vers le haut ce jour-là.`
								: '')
						}
					/>
				) : null}

				<Text variant="caption" color="muted">
					Protéines, lipides et taurine n'ont volontairement pas de maximum : le vrai risque de "trop", c'est l'excès
					calorique total — déjà surveillé par la barre kcal / DER ci-dessus.
				</Text>
			</Card>
		</View>
	);
}
