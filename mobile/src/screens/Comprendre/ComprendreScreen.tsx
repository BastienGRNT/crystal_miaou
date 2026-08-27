import type { ReactNode } from 'react';
import { ScrollView, View, Linking, Pressable } from 'react-native';
import { PageHeader } from '../../design-system/molecules/PageHeader';
import { Alert } from '../../design-system/molecules/Alert';
import { Card } from '../../design-system/atoms/Card';
import { Text } from '../../design-system/atoms/Text';
import { colors, spacing } from '../../design-system/tokens';

function Formula({ children }: { children: ReactNode }) {
	return (
		<View style={{ backgroundColor: colors.muted, borderRadius: 8, padding: spacing.sm }}>
			<Text variant="caption" style={{ fontFamily: 'monospace' as never }}>
				{children}
			</Text>
		</View>
	);
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
	return (
		<View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
			<View style={{ flexDirection: 'row', backgroundColor: colors.muted, padding: spacing.xs }}>
				{headers.map((h, i) => (
					<Text key={i} variant="caption" color="muted" style={{ flex: 1 }}>
						{h}
					</Text>
				))}
			</View>
			{rows.map((row, i) => (
				<View
					key={i}
					style={{ flexDirection: 'row', padding: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}
				>
					{row.map((cell, j) => (
						<Text key={j} variant="caption" style={{ flex: 1 }}>
							{cell}
						</Text>
					))}
				</View>
			))}
		</View>
	);
}

function SourceLink({ url, label }: { url: string; label: string }) {
	return (
		<Pressable onPress={() => Linking.openURL(url)}>
			<Text variant="caption" color="primary">
				{label}
			</Text>
		</Pressable>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Card style={{ gap: spacing.sm }}>
			<Text variant="subtitle">{title}</Text>
			{children}
		</Card>
	);
}

export function ComprendreScreen() {
	return (
		<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
			<PageHeader title="Comprendre le calcul" subtitle="Comment l'app calcule les besoins de votre chat, étape par étape, avec ses sources." />

			<Alert
				variant="warning"
				message={
					"Ce que cette app fait — et ne fait pas : l'app calcule une estimation basée sur des formules vétérinaires reconnues et sur les valeurs que vous saisissez pour vos aliments. Ce n'est jamais une prescription médicale. Vous êtes responsable de vérifier que les quantités affichées correspondent au dosage conseillé sur le paquet, et de consulter un vétérinaire pour toute question de santé, convalescence, ou situation particulière de votre chat."
				}
			/>

			<Section title="Le score du jour, en un coup d'œil">
				<Text variant="caption">
					La note sur 100 affichée en haut de l'accueil résume, en un chiffre, tout ce que l'app sait vérifier sur le
					menu du jour. Elle additionne trois axes indépendants — aucun seuil n'est inventé pour l'occasion.
				</Text>
				<Table
					headers={['Axe', 'Poids', 'Mesure']}
					rows={[
						['Quantité donnée', '40 pts', "Écart kcal du jour vs DER. Plein sous 3% d'écart."],
						['Équilibre des apports', '40 pts', 'Chaque repère hors cible (§4) retire des points.'],
						['Fiabilité des données', '20 pts', 'Valeurs estimées vs lues sur l’étiquette.']
					]}
				/>
				<Table
					headers={['Note', 'Signification']}
					rows={[
						['85–100', 'Excellent — vous pouvez y aller.'],
						['70–84', 'Bon — rien de bloquant.'],
						['55–69', 'Correct — donnable, à ajuster.'],
						['40–54', 'À améliorer — dépanne, pas idéal.'],
						['0–39', 'Insuffisant — à revoir avec votre vétérinaire.']
					]}
				/>
				<Alert
					variant="warning"
					message='Un point rouge prime toujours sur la note : si la quantité du jour passe sous le RER, ou si un seuil médical est franchi, l’app affiche « À corriger » même si la note globale reste bonne.'
				/>
				<Text variant="caption" color="muted">
					Sous le score, l'app liste les pistes à suivre, triées par impact : Prioritaire, puis Utile, puis Bonus.
				</Text>
			</Section>

			<Section title="1. Le besoin énergétique (RER puis DER)">
				<Text variant="caption">Tout part d'un besoin calorique journalier cible, en kcal/jour. On le calcule en deux temps.</Text>
				<Text variant="bodyMedium">RER — le métabolisme au repos</Text>
				<Text variant="caption" color="muted">Formule linéaire, valable pour la quasi-totalité des chats adultes (2 à 15 kg) :</Text>
				<Formula>RER (kcal/j) = 30 × poids (kg) + 70</Formula>
				<Text variant="caption" color="muted">
					En dessous de 2 kg (chaton) ou au-dessus de 15 kg, l'app bascule sur la formule allométrique :
				</Text>
				<Formula>RER (kcal/j) = 70 × poids (kg)^0.75</Formula>

				<Text variant="bodyMedium">DER — le besoin réel du jour</Text>
				<Text variant="caption" color="muted">Le RER est multiplié par un facteur qui dépend du profil du chat :</Text>
				<Formula>DER = RER × facteur</Formula>
				<Table
					headers={['Profil', 'Facteur']}
					rows={[
						['Chaton 0–4 mois', '2.5 – 3.0'],
						['Chaton 4–12 mois', '2.0'],
						['Adulte stérilisé, activité normale', '1.2 – 1.4'],
						['Adulte non stérilisé, actif', '1.4'],
						['Adulte stérilisé, intérieur peu actif', '1.0 – 1.2'],
						['Perte de poids visée', '0.8 – 1.0'],
						['Prise de poids visée', '1.2 – 1.8'],
						['Senior actif (>7 ans)', '1.1 – 1.4'],
						['Gestation', '1.6 – 2.0'],
						['Lactation', '2.0 – 6.0']
					]}
				/>
				<Alert
					variant="info"
					message="Activité perçue ≠ accès extérieur : un chat d'intérieur strict dépense moins d'énergie qu'un chat avec le même niveau d'activité perçu qui sort dehors — l'app pose donc deux questions distinctes."
				/>
				<Text variant="caption" color="muted">
					Le facteur ne descend jamais en dessous du RER, même en perte de poids — une restriction trop marquée expose à
					un risque de lipidose hépatique.
				</Text>
				<Text variant="caption" color="muted">Source : consensus WSAVA / AAHA.</Text>
			</Section>

			<Section title="2. L'énergie des aliments">
				<Text variant="caption">
					Pour chaque aliment, il faut connaître son énergie métabolisable (EM), en kcal/100g — la donnée clé pour
					convertir un besoin en kcal/jour en grammes/jour.
				</Text>
				<Alert
					variant="info"
					message="Cette valeur n'est presque jamais sur le paquet — c'est normal. L'analyse nutritionnelle (protéines, lipides, fibres, cendres), elle, est toujours imprimée, et suffit pour calculer l'EM avec l'équation NRC 2006 — la méthode des guides FEDIAF et des calculateurs vétérinaires."
				/>
				<Formula>
					{'1. Énergie brute = protéines × 5.7 + lipides × 9.4 + (glucides + fibres) × 4.1\n'}
					{'2. Digestibilité (%) = 87.9 − 0.88 × fibres en % de matière sèche\n'}
					{'3. Énergie digestible = énergie brute × digestibilité / 100\n'}
					{'4. EM (kcal/100g) = énergie digestible − 0.77 × protéines'}
				</Formula>
				<Text variant="caption" color="muted">
					(glucides estimés par différence quand absents de l'étiquette : 100 − protéines − lipides − cendres −
					humidité − fibres)
				</Text>
				<Table
					headers={['Donnée', "Sur l'étiquette ?"]}
					rows={[
						['Protéines, lipides', 'Obligatoire (UE)'],
						['Fibres brutes, cendres brutes', 'Obligatoire (UE)'],
						['Humidité', 'Obligatoire seulement au-dessus de 14%'],
						['EM, calcium, phosphore, taurine', 'Toujours facultatif']
					]}
				/>
			</Section>

			<Section title="3. La répartition du menu du jour">
				<Text variant="caption">
					Vous ne raisonnez jamais en grammes ou en calories — seulement en "quels aliments" et "à quelle heure".
					L'app calcule tout le reste pour couvrir exactement le DER.
				</Text>
				<Text variant="caption">
					1. <Text variant="bodyMedium">Pâtée</Text> : nombre de paquets entiers/jour — jamais un demi ou un tiers,
					jamais 0 tant qu'elle est active.{'\n'}
					2. <Text variant="bodyMedium">Friandise</Text> : quantité choisie par vous, pas calculée.{'\n'}
					3. <Text variant="bodyMedium">Croquette</Text> : absorbe le budget calorique restant (DER − pâtée −
					friandise). Jamais de quantité négative.{'\n'}
					4. Pâtée et friandise réparties à parts égales entre créneaux non verrouillés.
				</Text>
				<Text variant="bodyMedium">Pourquoi deux croquettes du même jour n'ont pas le même poids</Text>
				<Text variant="caption" color="muted">
					Chaque créneau reçoit un objectif qui dépend du temps jusqu'au prochain repas (tous aliments confondus) :
				</Text>
				<Formula>objectif du créneau (kcal) = durée jusqu'au repas suivant × (DER / durée pondérée du jour)</Formula>
				<Text variant="caption" color="muted">
					La nuit (22h-7h) compte pour 40% de sa durée réelle. Les kcal déjà apportées par un autre aliment au même
					horaire sont déduites de l'objectif avant de peser la croquette.
				</Text>
				<Alert
					variant="info"
					message={'"Jusqu\'au prochain repas", pas "depuis le dernier" : le repas qui précède un long trou est volontairement le plus gros — il doit tenir le chat jusqu\'au suivant.'}
				/>
				<Text variant="caption" color="muted">
					Deux garde-fous par créneau croquette non verrouillé : un plancher de 6g, et un plafond à 2.5 fois le plus
					petit repas du jour — la différence est toujours reprise/redonnée ailleurs, le total du jour ne change
					jamais.
				</Text>
			</Section>

			<Section title="4. Vérifier que la ration est équilibrée">
				<Text variant="caption">
					L'app compare ce qu'elle sait à des valeurs de référence en gramme par 1000 kcal (pas le % brut de
					l'étiquette, pas comparable entre croquette et pâtée à cause de l'humidité).
				</Text>
				<Formula>nutriment (g/1000kcal) = nutriment total de la ration (g) / kcal totales × 1000</Formula>
				<Table
					headers={['Nutriment', 'Min', 'Max']}
					rows={[
						['Protéines', '50 g/1000kcal', '—'],
						['Lipides', '22 g/1000kcal', '—'],
						['Calcium', '1.4 g/1000kcal', '6 g/1000kcal'],
						['Phosphore', '1.3 g/1000kcal', '2.5 g/1000kcal'],
						['Taurine', '1.0 (croquette) / 1.7 (pâtée)', '—'],
						['Ratio Ca:P', '1:1', '2:1'],
						['Glucides', '—', '25% MS (surveiller), 30% (à éviter)']
					]}
				/>
				<Text variant="bodyMedium">Glucides : ce que donnent vraiment les produits du commerce</Text>
				<Text variant="caption" color="muted">
					L'idéal scientifique reste sous 10-12% de matière sèche — quasi inatteignable pour une croquette extrudée
					classique (l'amidon sert de liant à la cuisson, y compris "sans céréales"). Les seuils utilisés par l'app
					sont des repères d'usage plus réalistes : en dessous de 25%, correct pour du sec ; 25-30%, un peu élevé ;
					au-delà, à éviter si possible.
				</Text>
				<Table
					headers={['Catégorie', 'Glucides (% MS)']}
					rows={[
						['Croquette premium / "low-carb"', '~15 – 25%'],
						['Croquette milieu de gamme', '~25 – 35%'],
						['Croquette entrée de gamme', '~35 – 45%'],
						['Pâtée pur viande, sans céréales', '~0 – 10%'],
						['Pâtée avec céréales/sauce épaissie', '~10 – 25%']
					]}
				/>
				<Alert
					variant="info"
					message={'"Pas de maximum" ne veut pas dire "pas de risque d\'excès" : protéines, lipides et taurine n\'ont volontairement pas de maximum — le vrai risque de "trop", c\'est l\'excès calorique total.'}
				/>
				<Alert
					variant="warning"
					message="Un déficit/excès ne se corrige jamais en changeant la quantité — ce sont des ratios : seul un changement de composition (autre aliment, autre répartition croquette/pâtée) les corrige."
				/>
				<Text variant="caption" color="muted">
					Source : recommandations FEDIAF/AAFCO/NRC pour l'entretien du chat adulte (FEDIAF mise à jour 09/2024).
				</Text>
			</Section>

			<Section title="5. Vérifier dans le temps">
				<Text variant="caption">
					Le DER calculé est un point de départ théorique. Pratique vétérinaire usuelle : on nourrit selon ce calcul
					2-3 semaines, on repèse, on évalue la silhouette, puis on ajuste d'environ ±10% si besoin.
				</Text>
				<Text variant="caption" color="muted">
					L'onglet Mes chats → Suivi de poids enregistre les pesées dans le temps. L'app affiche la tendance et
					suggère de revoir la ration si besoin — jamais un ajustement automatique, toujours vous (et votre
					vétérinaire) qui décidez.
				</Text>
				<Text variant="caption" color="muted">
					Chaque chat a une rangée de boutons "Besoin ajusté" (−10%, −5%, Normal, +5%, +10%) directement sur sa
					fiche, dans l'onglet Mes chats.
				</Text>
			</Section>

			<Section title="Sources">
				<Text variant="caption">• WSAVA — World Small Animal Veterinary Association.</Text>
				<Text variant="caption">• AAHA — American Animal Hospital Association.</Text>
				<Text variant="caption">• NRC — "Nutrient Requirements of Dogs and Cats".</Text>
				<Text variant="caption">• FEDIAF — guide nutritionnel (mise à jour 09/2024).</Text>
				<Text variant="caption">• AAFCO — "Guaranteed Analysis" et profils nutritionnels.</Text>
				<SourceLink url="https://doi.org/10.3390/vetsci4040055" label="Verbrugghe A, Hesta M (2017), Veterinary Sciences 4(4):55" />
				<SourceLink url="https://www.walkervillevet.com.au/blog/carbohydrates-levels-cat-food/" label="Walkerville Vet — teneur en glucides de produits commerciaux" />
				<SourceLink
					url="https://www.catmumjournal.co.uk/post/how-to-calculate-carbohydrates-in-cat-food-and-understanding-dry-matter-basis"
					label="Cat Mum Journal — calcul en matière sèche"
				/>
				<SourceLink url="https://catinfo.org/commercial-cat-foods/" label="catinfo.org (Dr Lisa Pierson, DVM)" />
			</Section>
		</ScrollView>
	);
}
