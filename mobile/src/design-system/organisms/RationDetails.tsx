import { View } from 'react-native';
import type { RepartitionOkResponse } from '@shared/repartition';
import type { NomNutrimentValide, StatutNutriment } from '@shared/nutrition';
import { Disclosure } from '../molecules/Disclosure';
import { Alert } from '../molecules/Alert';
import { Badge, type BadgeVariant } from '../atoms/Badge';
import { Text } from '../atoms/Text';
import { Progress } from '../atoms/Progress';
import { Button } from '../atoms/Button';
import { QuantitySlider } from '../molecules/QuantitySlider';
import { colors, spacing } from '../tokens';
import { usePatchCatFoodSelection } from '../../api/cats';

const nutrimentLabels: Record<NomNutrimentValide, string> = {
	proteines: 'Protéines',
	lipides: 'Lipides',
	calcium: 'Calcium',
	phosphore: 'Phosphore',
	taurine: 'Taurine',
	glucides: 'Glucides',
	ratioCalciumPhosphore: 'Ratio Ca:P'
};

const statutLabels: Record<StatutNutriment, string> = { OK: 'OK', DEFICIT: 'Déficit', EXCES: 'Excès', ATTENTION: 'À surveiller' };
const statutBadgeVariant: Record<StatutNutriment, BadgeVariant> = { OK: 'success', DEFICIT: 'destructive', EXCES: 'warning', ATTENTION: 'warning' };
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

function formatCible(nutriment: NomNutrimentValide, seuil: { min: number | null; max: number | null }): string {
	const unite = nutrimentUnite[nutriment];
	if (seuil.min !== null && seuil.max !== null) return `cible ${seuil.min} – ${seuil.max}${unite}`;
	if (seuil.min !== null) return `cible ≥ ${seuil.min}${unite}`;
	if (seuil.max !== null) return `cible ≤ ${seuil.max}${unite}`;
	return 'pas de seuil strict';
}

function formatEcart(statut: { valeur: number; seuil: { max: number | null }; ratioEcart: number | null }): string | null {
	if (statut.ratioEcart === null) return null;
	if (statut.seuil.max !== null && statut.valeur > statut.seuil.max) {
		return `${statut.ratioEcart.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}× la cible`;
	}
	return `à ${Math.round(statut.ratioEcart * 100)}% du minimum`;
}

function formatValeursEstimees(aliment: { emEstimee: boolean; humiditeEstimee: boolean; glucidesEstimes: boolean }): string {
	const flags: string[] = [];
	if (aliment.emEstimee) flags.push('EM');
	if (aliment.humiditeEstimee) flags.push('humidité');
	if (aliment.glucidesEstimes) flags.push('glucides');
	return flags.join(', ');
}

interface RationDetailsProps {
	repartition: RepartitionOkResponse;
	catId: string;
	date: string;
}

export function RationDetails({ repartition, catId }: RationDetailsProps) {
	const patchFoodSelection = usePatchCatFoodSelection(catId);

	const aUnRatioADeplacer = repartition.ration.statuts.some((s) => s.statut !== 'OK');
	const glucidesEnAttention = repartition.ration.statuts.some((s) => s.nutriment === 'glucides' && s.statut === 'ATTENTION');
	const alimentsEmEstimee = repartition.ration.fiabiliteParAliment.filter((a) => a.emEstimee).map((a) => a.foodName);

	const packageSizePatee = repartition.repas.find((r) => r.foodType === 'patee')?.food.packageSizeG ?? null;
	const pateePaquetsBase = repartition.pateeNombrePaquetsOverride ?? repartition.nombrePaquetsPatee ?? 0.5;

	return (
		<View style={{ gap: spacing.md }}>
			<Disclosure title="Le détail du calcul">
				<Text variant="caption" color="muted">
					{Math.round(repartition.ration.totalKcal)} kcal sur {Math.round(repartition.der)} visés — les chiffres derrière
					le score.
				</Text>

				{repartition.ration.sousLeRER ? (
					<Alert
						variant="error"
						message={`Sous le RER : la ration du jour descend sous le RER de votre chat (${Math.round(repartition.rer)} kcal) — risque de lipidose hépatique en cas de restriction trop marquée. Un vétérinaire doit valider tout objectif de perte de poids agressif.`}
					/>
				) : null}

				<View style={{ gap: spacing.md }}>
					{repartition.ration.statuts.map((statut) => {
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

				{aUnRatioADeplacer ? (
					<Alert
						variant="warning"
						message={
							"Baisser la ration ne corrige pas ces ratios : ils sont calculés par rapport aux calories, pas au poids donné — la quantité totale est déjà ajustée pour couvrir le DER. Pour corriger un déficit ou un excès, il faut changer d'aliment, ou ajuster la répartition croquette / pâtée." +
							(glucidesEnAttention && repartition.ration.glucidesParAliment.length > 0
								? ` Répartition des glucides : ${repartition.ration.glucidesParAliment.map((a) => `${a.foodName} (${a.pctMatiereSeche.toFixed(0)}% MS)`).join(', ')}.`
								: '')
						}
					/>
				) : null}

				{alimentsEmEstimee.length > 0 ? (
					<Alert
						variant="info"
						message={`* Énergie calculée par l'app, pas lue sur l'étiquette — pour ${alimentsEmEstimee.join(', ')}, l'app calcule le kcal/100g à partir de l'analyse nutritionnelle avec l'équation NRC 2006. Un écart de 10-15% avec le tableau du paquet est normal.`}
					/>
				) : null}

				{repartition.ration.fiabiliteParAliment.length > 0 ? (
					<Alert
						variant="warning"
						message={`Valeurs partiellement estimées — ces aliments actifs reposent sur au moins une valeur estimée plutôt que déclarée par le fabricant : ${repartition.ration.fiabiliteParAliment
							.map((a) => `${a.foodName} (${formatValeursEstimees(a)})`)
							.join(', ')}.`}
					/>
				) : null}

				<Text variant="caption" color="muted">
					Point de départ calculé, pas une prescription figée : vérifiez que ces quantités correspondent au dosage
					conseillé sur le paquet, suivez le poids réel de votre chat dans le temps, et consultez votre vétérinaire en
					cas de doute.
				</Text>
			</Disclosure>

			{repartition.nombrePaquetsPatee !== null ? (
				<Disclosure title="Ajuster la pâtée">
					<Text variant="caption" color="muted">
						{repartition.nombrePaquetsPatee % 1 === 0 ? repartition.nombrePaquetsPatee : repartition.nombrePaquetsPatee.toFixed(1)}{' '}
						paquet{repartition.nombrePaquetsPatee > 1 ? 's' : ''} par jour
						{repartition.pateeNombrePaquetsOverride !== null ? ' — fixé par vous' : " — calculé par l'app"}
					</Text>
					<Text variant="caption" color="muted">
						Le nombre de paquets par jour est calculé pour coller au besoin de votre chat, puis réparti sur ses
						créneaux pâtée. Fixez-le vous-même seulement si votre vétérinaire ou le paquet vous indique une autre
						quantité.
					</Text>

					<QuantitySlider
						value={pateePaquetsBase}
						minimumValue={0.5}
						maximumValue={Math.max(pateePaquetsBase * 2, 3)}
						step={0.5}
						disabled={patchFoodSelection.isPending}
						formatValue={(v) => `${v % 1 === 0 ? v : v.toFixed(1)} paquet${v > 1 ? 's' : ''}${packageSizePatee ? ` (${v * packageSizePatee} g)` : ''}`}
						onCommit={(v) => patchFoodSelection.mutate({ pateeNombrePaquetsOverride: v })}
					/>

					{repartition.pateeNombrePaquetsOverride !== null ? (
						<View style={{ flexDirection: 'row' }}>
							<Button
								variant="secondary"
								label="Revenir au calcul automatique"
								onPress={() => patchFoodSelection.mutate({ pateeNombrePaquetsOverride: null })}
								disabled={patchFoodSelection.isPending}
							/>
						</View>
					) : null}

					{patchFoodSelection.isError ? <Alert variant="error" message="Impossible d'enregistrer le nombre de paquets." /> : null}
				</Disclosure>
			) : null}
		</View>
	);
}
