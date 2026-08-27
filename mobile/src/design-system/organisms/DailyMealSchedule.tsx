import { useMemo, useState } from 'react';
import { View, Alert as RNAlert } from 'react-native';
import { Drumstick, Beef, Fish, RotateCcw, SlidersHorizontal, Check } from 'lucide-react-native';
import type { RepartitionOkResponse, RepasRepartition } from '@shared/repartition';
import { Card } from '../atoms/Card';
import { Text } from '../atoms/Text';
import { Badge } from '../atoms/Badge';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';
import { Progress } from '../atoms/Progress';
import { Alert } from '../molecules/Alert';
import { QuantitySlider } from '../molecules/QuantitySlider';
import { RationScoreCard } from './RationScoreCard';
import { RationSummaryCard } from './RationSummaryCard';
import { colors, spacing } from '../tokens';
import { usePatchMealEntry, useResetRepartition } from '../../api/today';

const foodTypeIcon = { croquette: Drumstick, patee: Beef, friandise: Fish } as const;

function formatHeure(consumedAt: string): string {
	return new Date(consumedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function labelDonne(repas: RepasRepartition): string {
	return repas.distributionMode === 'distributeur_automatique' ? 'Donné (auto)' : 'Donné à la main';
}

function formatPaquets(paquets: number): string {
	return `${paquets % 1 === 0 ? paquets : paquets.toFixed(1)} paquet${paquets > 1 ? 's' : ''}`;
}

/** Affichage de la quantité confirmée par le serveur — jamais recalculée (CLAUDE.md règle 9). */
function formatQuantite(repas: RepasRepartition): string {
	if (repas.foodType === 'patee' && repas.paquets !== null) return formatPaquets(repas.paquets);
	if (repas.doses !== null) return `${repas.doses} dose${repas.doses > 1 ? 's' : ''} (${repas.quantiteG} g)`;
	return `${repas.quantiteG} g`;
}

/** Aperçu live pendant le drag du slider, avant tout commit serveur — seule exception à la règle
 * ci-dessus : la valeur n'existe encore nulle part côté serveur, un round-trip par pixel glissé n'est
 * pas envisageable. La quantité persistée reste toujours re-arrondie côté API au relâchement
 * (`mealEntry.service.ts`), ce qui peut différer légèrement de cet aperçu. */
function formatQuantitePreview(repas: RepasRepartition, liveValueG: number): string {
	if (repas.foodType === 'patee' && repas.food.packageSizeG) return formatPaquets(liveValueG / repas.food.packageSizeG);
	if (repas.distributionMode === 'distributeur_automatique' && repas.food.doseDistributeurG) {
		const doses = Math.round(liveValueG / repas.food.doseDistributeurG);
		return `${doses} dose${doses > 1 ? 's' : ''} (${liveValueG} g)`;
	}
	return `${liveValueG} g`;
}

function sliderStep(repas: RepasRepartition): number {
	if (repas.foodType === 'patee' && repas.food.packageSizeG) return repas.food.packageSizeG / 2;
	if (repas.distributionMode === 'distributeur_automatique' && repas.food.doseDistributeurG) {
		return repas.food.doseDistributeurG;
	}
	return 0.5;
}

interface DailyMealScheduleProps {
	repartition: RepartitionOkResponse;
	catId: string;
	date: string;
	onNavigateToHref?: (href: string) => void;
}

export function DailyMealSchedule({ repartition, catId, date, onNavigateToHref }: DailyMealScheduleProps) {
	const patchMealEntry = usePatchMealEntry(catId, date);
	const resetRepartition = useResetRepartition(catId, date);
	const [ajustementOuvertId, setAjustementOuvertId] = useState<string | null>(null);

	const repasDonnes = repartition.repas.filter((r) => r.validated).length;
	const avancementPct = repartition.repas.length > 0 ? Math.round((repasDonnes / repartition.repas.length) * 100) : 0;
	const prochainRepas = repartition.repas.find((r) => !r.validated) ?? null;

	const groupesHoraires = useMemo(() => {
		const parHeure = new Map<string, RepasRepartition[]>();
		for (const repas of repartition.repas) {
			const liste = parHeure.get(repas.consumedAt) ?? [];
			liste.push(repas);
			parHeure.set(repas.consumedAt, liste);
		}
		return [...parHeure.entries()]
			.sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
			.map(([consumedAt, repasList]) => {
				const kcalTotal = repasList.reduce((somme, r) => somme + r.kcal, 0);
				return {
					consumedAt,
					repasList,
					kcalTotal,
					pctDER: repartition.der > 0 ? Math.round((kcalTotal / repartition.der) * 100) : 0
				};
			});
	}, [repartition.repas, repartition.der]);

	function handleToggleValidated(repas: RepasRepartition, validated: boolean) {
		patchMealEntry.mutate({ id: repas.id, input: { validated, ...(validated ? { quantityG: repas.quantiteG } : {}) } });
		if (validated) setAjustementOuvertId(null);
	}

	function handleSliderCommit(repas: RepasRepartition, value: number) {
		patchMealEntry.mutate({ id: repas.id, input: { quantityG: value } });
	}

	function handleReset() {
		RNAlert.alert(
			'Réinitialiser la journée ?',
			"Tous les repas déjà cochés « donné » ou ajustés seront effacés et recalculés depuis la routine.",
			[
				{ text: 'Annuler', style: 'cancel' },
				{ text: 'Réinitialiser', style: 'destructive', onPress: () => resetRepartition.mutate() }
			]
		);
	}

	return (
		<View style={{ gap: spacing.lg }}>
			<RationScoreCard score={repartition.ration.score} onNavigateToHref={onNavigateToHref} />

			{repartition.avertissements.map((avertissement, i) => (
				<Alert key={i} variant="warning" message={avertissement} />
			))}

			<RationSummaryCard repartition={repartition} />

			<Card style={{ gap: spacing.md }}>
				<View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }}>
					<View style={{ flex: 1, gap: 2 }}>
						<Text variant="heading">Repas du jour</Text>
						<Text variant="caption" color="muted">
							{repartition.repas.length === 0
								? 'Aucun créneau prévu aujourd’hui.'
								: repasDonnes === repartition.repas.length
									? 'Tous les repas ont été donnés.'
									: prochainRepas
										? `Prochain : ${formatHeure(prochainRepas.consumedAt)} — ${formatQuantite(prochainRepas)} de ${prochainRepas.food.name}`
										: ''}
						</Text>
					</View>
					<Badge label={`${repasDonnes} / ${repartition.repas.length} donnés`} variant={repasDonnes === repartition.repas.length ? 'success' : 'default'} />
				</View>

				<Progress positionPct={avancementPct} color={repasDonnes === repartition.repas.length ? colors.success : colors.primary} />

				<View>
					{groupesHoraires.map((groupe, i) => {
						const tousValides = groupe.repasList.every((r) => r.validated);
						return (
							<View key={groupe.consumedAt} style={{ flexDirection: 'row', gap: spacing.md }}>
								<View style={{ alignItems: 'center', width: 12 }}>
									<View
										style={{
											marginTop: 6,
											width: 12,
											height: 12,
											borderRadius: 6,
											backgroundColor: tousValides ? colors.success : colors.primary
										}}
									/>
									{i < groupesHoraires.length - 1 ? <View style={{ width: 1, flex: 1, backgroundColor: colors.border }} /> : null}
								</View>

								<View style={{ flex: 1, paddingBottom: spacing.lg, gap: spacing.sm }}>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
										<Text variant="heading">{formatHeure(groupe.consumedAt)}</Text>
										<Text variant="caption" color="muted">
											{groupe.kcalTotal} kcal · {groupe.pctDER}% du DER
										</Text>
									</View>
									<Progress positionPct={Math.min(groupe.pctDER, 100)} color={tousValides ? colors.success : colors.primary} />

									{groupe.repasList.map((repas) => {
										const Icon = foodTypeIcon[repas.foodType];
										const isPending = patchMealEntry.isPending && patchMealEntry.variables?.id === repas.id;
										return (
											<View
												key={repas.id}
												style={{
													borderRadius: 12,
													borderWidth: 1,
													borderColor: repas.validated ? colors.success : colors.border,
													backgroundColor: repas.validated ? colors.successMuted : colors.muted,
													padding: spacing.md,
													gap: spacing.sm
												}}
											>
												<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
													<View
														style={{
															width: 36,
															height: 36,
															borderRadius: 10,
															alignItems: 'center',
															justifyContent: 'center',
															backgroundColor: repas.validated ? colors.success : colors.card
														}}
													>
														{repas.validated ? (
															<Check size={18} color={colors.background} />
														) : (
															<Icon size={18} color={colors.mutedForeground} />
														)}
													</View>
													<View style={{ flex: 1 }}>
														<View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
															<Text variant="bodyMedium" color="primary">
																{formatQuantite(repas)}
															</Text>
															<Text variant="caption" color="muted">
																{repas.kcal} kcal
															</Text>
														</View>
														<Text variant="caption" color="muted" numberOfLines={1}>
															{repas.food.name} ({repas.food.brand})
														</Text>
													</View>
													<Checkbox
														checked={repas.validated}
														disabled={isPending}
														onChange={(checked) => handleToggleValidated(repas, checked)}
													/>
												</View>

												<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
													{repas.validated && repas.validatedBy && repas.validatedAt ? (
														<Text variant="caption" color="muted">
															coché par {repas.validatedBy.name} à {formatHeure(repas.validatedAt)}
														</Text>
													) : repas.validated ? (
														<Text variant="caption" color="muted">
															Distribué automatiquement — décochez si ce n'est pas le cas
														</Text>
													) : (
														<>
															<Text variant="caption" color="muted">
																{repas.locked ? 'Quantité fixée à la main' : "Quantité calculée par l'app"}
															</Text>
															<Button
																variant="ghost"
																label={ajustementOuvertId === repas.id ? 'Fermer' : 'Ajuster'}
																onPress={() => setAjustementOuvertId(ajustementOuvertId === repas.id ? null : repas.id)}
															/>
														</>
													)}
												</View>

												{ajustementOuvertId === repas.id && !repas.validated ? (
													<View style={{ gap: spacing.xs }}>
														<QuantitySlider
															value={repas.quantiteG}
															maximumValue={Math.max(repas.quantiteG * 2, 50)}
															step={sliderStep(repas)}
															formatValue={(v) => formatQuantitePreview(repas, v)}
															onCommit={(v) => handleSliderCommit(repas, v)}
														/>
														<Text variant="caption" color="muted">
															Ce créneau ne sera plus recalculé automatiquement tant que vous n'aurez pas
															réinitialisé la journée.
														</Text>
													</View>
												) : null}
											</View>
										);
									})}
								</View>
							</View>
						);
					})}
				</View>

				<Button
					variant="ghost"
					label="Repartir du calcul automatique"
					loading={resetRepartition.isPending}
					onPress={handleReset}
				/>
			</Card>
		</View>
	);
}
