<script lang="ts">
	import Card from '$lib/components/atoms/Card.svelte';
	import Alert from '$lib/components/molecules/Alert.svelte';
	import PageHeader from '$lib/components/molecules/PageHeader.svelte';
</script>

<div class="mx-auto max-w-3xl px-4 py-8 md:py-10">
	<PageHeader
		title="Comprendre le calcul"
		subtitle="Comment l'app calcule les besoins de votre chat, étape par étape, avec ses sources."
	/>

	<Alert variant="warning" title="Ce que cette app fait — et ne fait pas" class="mb-6">
		L'app calcule une <strong>estimation</strong> basée sur des formules vétérinaires reconnues et sur
		les valeurs que vous saisissez pour vos aliments. Ce n'est jamais une prescription médicale.
		<strong>Vous êtes responsable</strong> de vérifier que les quantités affichées correspondent au
		dosage conseillé sur le paquet, et de consulter un vétérinaire pour toute question de santé,
		convalescence, ou situation particulière de votre chat.
	</Alert>

	<div class="flex flex-col gap-6">
		<Card class="scroll-mt-24" id="score">
			{#snippet header()}<h2 class="text-lg">Le score du jour, en un coup d'œil</h2>{/snippet}
			<p class="text-sm text-foreground">
				La note sur 100 affichée en haut de l'accueil résume, en un chiffre, tout ce que l'app sait
				vérifier sur le menu du jour. Elle additionne trois axes indépendants — aucun seuil n'est
				inventé pour l'occasion : ce sont exactement les repères détaillés dans les sections suivantes.
			</p>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[480px] text-sm">
					<thead>
						<tr class="border-b border-border text-left text-muted-foreground">
							<th class="py-1.5 pr-3 font-medium">Axe</th>
							<th class="py-1.5 pr-3 font-medium">Poids</th>
							<th class="py-1.5 font-medium">Ce qui est mesuré</th>
						</tr>
					</thead>
					<tbody class="text-foreground">
						<tr class="border-b border-border/50">
							<td class="py-1.5 pr-3">Quantité donnée</td>
							<td class="pr-3">40 pts</td>
							<td>Écart entre les kcal du jour et le DER (§1). Score plein sous 3% d'écart, dégressif ensuite.</td>
						</tr>
						<tr class="border-b border-border/50">
							<td class="py-1.5 pr-3">Équilibre des apports</td>
							<td class="pr-3">40 pts</td>
							<td>Chaque repère hors cible (§4) retire des points : 10 à 14 pour un seuil médical franchi, 6 à 9 pour un indicateur qualité comme les glucides.</td>
						</tr>
						<tr>
							<td class="py-1.5 pr-3">Fiabilité des données</td>
							<td class="pr-3">20 pts</td>
							<td>Combien de valeurs sont estimées par l'app (§2) plutôt que lues sur l'étiquette, et combien de nutriments manquent pour vérifier.</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[420px] text-sm">
					<thead>
						<tr class="border-b border-border text-left text-muted-foreground">
							<th class="py-1.5 pr-3 font-medium">Note</th>
							<th class="py-1.5 font-medium">Ce que ça veut dire</th>
						</tr>
					</thead>
					<tbody class="text-foreground">
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">85 – 100</td><td>Excellent — vous pouvez y aller.</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">70 – 84</td><td>Bon — rien de bloquant, une ou deux améliorations possibles.</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">55 – 69</td><td>Correct — donnable, mais à ajuster sur la durée.</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">40 – 54</td><td>À améliorer — dépanne, pas idéal au long cours.</td></tr>
						<tr><td class="py-1.5 pr-3">0 – 39</td><td>Insuffisant — à revoir, et à évoquer avec votre vétérinaire.</td></tr>
					</tbody>
				</table>
			</div>

			<Alert variant="warning" title="Un point rouge prime toujours sur la note">
				Si la quantité du jour passe sous le métabolisme de repos (RER), ou si un seuil médical est
				franchi, l'app affiche <strong>« À corriger »</strong> même si la note globale reste bonne
				grâce aux deux autres axes. Une bonne moyenne ne compense pas un problème de santé.
			</Alert>

			<p class="text-sm text-muted-foreground">
				Sous le score, l'app liste les <strong>pistes à suivre</strong>, triées par impact :
				« Prioritaire » d'abord (ce qui fait vraiment bouger la note et la santé du chat), puis
				« Utile », puis « Bonus » (compléter une étiquette, par exemple — utile pour la précision,
				sans conséquence immédiate pour le chat).
			</p>
			<p class="text-xs text-muted-foreground">
				Ce score est un outil de lecture, pas une norme officielle : aucune institution vétérinaire ne
				publie de « note sur 100 » pour une ration. Ce sont les <em>seuils</em> qu'il agrège (FEDIAF,
				NRC, WSAVA) qui font référence — la pondération entre les trois axes est un choix de cette
				app, expliqué ici pour que vous puissiez le juger vous-même.
			</p>
		</Card>

		<Card>
			{#snippet header()}<h2 class="text-lg">1. Le besoin énergétique (RER puis DER)</h2>{/snippet}
			<p class="text-sm text-foreground">
				Tout part d'un besoin calorique journalier cible, en kcal/jour. On le calcule en deux temps.
			</p>

			<h3 class="text-sm font-semibold text-foreground">RER — le métabolisme au repos</h3>
			<p class="text-sm text-muted-foreground">
				Formule linéaire, valable pour la quasi-totalité des chats adultes (2 à 15 kg — un chat en
				bonne santé pèse rarement plus de 8-10 kg, même les grandes races ou les cas de surpoids
				marqué dépassent très rarement 15 kg) :
			</p>
			<p class="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
				RER (kcal/j) = 30 × poids (kg) + 70
			</p>
			<p class="text-sm text-muted-foreground">
				En dessous de 2 kg (chaton) ou au-dessus de 15 kg (obésité marquée, cas rare), l'app bascule
				automatiquement sur la formule allométrique, plus précise à ces extrêmes :
			</p>
			<p class="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
				RER (kcal/j) = 70 × poids (kg)<sup>0.75</sup>
			</p>

			<h3 class="text-sm font-semibold text-foreground">DER — le besoin réel du jour</h3>
			<p class="text-sm text-muted-foreground">
				Le RER est multiplié par un facteur qui dépend du profil du chat (âge, stérilisation, activité,
				objectif de poids, gestation...) :
			</p>
			<p class="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">DER = RER × facteur</p>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[420px] text-sm">
					<thead>
						<tr class="border-b border-border text-left text-muted-foreground">
							<th class="py-1.5 pr-3 font-medium">Profil</th>
							<th class="py-1.5 font-medium">Facteur</th>
						</tr>
					</thead>
					<tbody class="text-foreground">
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Chaton 0–4 mois</td><td>2.5 – 3.0</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Chaton 4–12 mois</td><td>2.0</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Adulte stérilisé, activité normale</td><td>1.2 – 1.4</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Adulte non stérilisé, actif</td><td>1.4</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Adulte stérilisé, intérieur peu actif</td><td>1.0 – 1.2</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Perte de poids visée</td><td>0.8 – 1.0</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Prise de poids visée</td><td>1.2 – 1.8</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Senior actif (&gt;7 ans)</td><td>1.1 – 1.4</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Gestation</td><td>1.6 – 2.0</td></tr>
						<tr><td class="py-1.5 pr-3">Lactation</td><td>2.0 – 6.0</td></tr>
					</tbody>
				</table>
			</div>
			<Alert variant="info" title="Activité perçue ≠ accès extérieur">
				Deux chats "modérément actifs" n'ont pas forcément le même besoin : un chat qui joue 20-30
				min/jour mais reste en intérieur strict dépense moins d'énergie qu'un chat avec le même
				niveau d'activité qui sort dehors. L'app pose donc deux questions distinctes (niveau
				d'activité, et accès à l'extérieur) — un chat d'intérieur strict tire le facteur légèrement
				vers le bas, à niveau d'activité perçu égal.
			</Alert>

			<p class="text-xs text-muted-foreground">
				Le facteur exact utilisé pour votre chat se déduit automatiquement de son profil (Mes chats).
				Il ne descend jamais en dessous du RER, même en perte de poids — chez le chat, une restriction
				trop marquée expose à un risque de lipidose hépatique.
			</p>
			<p class="text-xs text-muted-foreground">Source : consensus WSAVA / AAHA.</p>
		</Card>

		<Card>
			{#snippet header()}<h2 class="text-lg">2. L'énergie des aliments</h2>{/snippet}
			<p class="text-sm text-foreground">
				Pour chaque aliment, il faut connaître son énergie métabolisable (EM), en kcal/100g — c'est
				la donnée clé qui permet de convertir un besoin en kcal/jour en grammes/jour.
			</p>
			<Alert variant="info" title="Cette valeur n'est presque jamais sur le paquet — c'est normal">
				En Europe, l'EM n'est pas une mention obligatoire : la plupart des emballages grand public ne
				l'indiquent pas. Ce qui est <strong>toujours</strong> imprimé, en revanche, c'est l'analyse
				nutritionnelle (protéines, lipides, fibres, cendres) — et elle suffit pour calculer l'EM.
				L'app utilise pour ça l'équation <strong>NRC 2006</strong>, la méthode des guides FEDIAF et
				des calculateurs vétérinaires. Ce n'est pas un bouche-trou : c'est la façon standard de
				procéder quand l'étiquette ne donne pas l'énergie. Si vous trouvez la valeur du fabricant,
				saisissez-la — sinon l'estimation reste parfaitement utilisable.
			</Alert>
			<p class="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
				1. Énergie brute = protéines × 5.7 + lipides × 9.4 + (glucides + fibres) × 4.1<br />
				2. Digestibilité (%) = 87.9 − 0.88 × fibres en % de matière sèche<br />
				3. Énergie digestible = énergie brute × digestibilité / 100<br />
				4. EM (kcal/100g) = énergie digestible − 0.77 × protéines
			</p>
			<p class="text-xs text-muted-foreground">
				(glucides estimés par différence quand absents de l'étiquette : 100 − protéines − lipides −
				cendres − humidité − fibres)
			</p>
			<p class="text-xs text-muted-foreground">
				Source : équation NRC 2006, méthode FEDIAF en 4 étapes. Les coefficients sont spécifiques au
				chat — l'étape 4 retranche l'énergie perdue dans les urines, l'étape 2 celle perdue dans les
				fèces, ce que la vieille formule d'Atwater ignorait (elle sous-estimait l'énergie des
				croquettes, donc surestimait les grammes à donner).
			</p>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[420px] text-sm">
					<thead>
						<tr class="border-b border-border text-left text-muted-foreground">
							<th class="py-1.5 pr-3 font-medium">Donnée</th>
							<th class="py-1.5 font-medium">Sur l'étiquette ?</th>
						</tr>
					</thead>
					<tbody class="text-foreground">
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Protéines, lipides</td><td>Obligatoire (UE)</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Fibres brutes, cendres brutes</td><td>Obligatoire (UE)</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Humidité</td><td>Obligatoire seulement au-dessus de 14% — quasi jamais pour une croquette sèche</td></tr>
						<tr><td class="py-1.5 pr-3">EM, calcium, phosphore, taurine</td><td>Toujours facultatif, mention volontaire du fabricant</td></tr>
					</tbody>
				</table>
			</div>
			<p class="text-xs text-muted-foreground">
				L'app suit cette réalité : protéines/lipides/fibres/cendres sont obligatoires dans le
				formulaire aliment (toujours sur l'étiquette en pratique), l'humidité est optionnelle — si
				vous ne l'avez pas, l'app applique un défaut générique par type d'aliment et l'affiche avec
				un badge "à vérifier" plutôt que de vous forcer à en inventer une.
			</p>
		</Card>

		<Card>
			{#snippet header()}<h2 class="text-lg">3. La répartition du menu du jour</h2>{/snippet}
			<p class="text-sm text-foreground">
				Vous ne raisonnez jamais en grammes ou en calories — seulement en "quels aliments" et "à
				quelle heure". L'app calcule tout le reste pour couvrir exactement le DER.
			</p>
			<ol class="list-decimal space-y-1.5 pl-5 text-sm text-foreground">
				<li>
					<strong>Pâtée</strong> : nombre de paquets <strong>entiers</strong>/jour — jamais un demi ou
					un tiers de paquet, jamais 0 tant qu'elle est active. En cas d'hésitation entre deux nombres
					de paquets également proches du DER, l'app choisit le plus petit : la pâtée coûte cher, mieux
					vaut ouvrir un paquet de moins et laisser la croquette (moins chère) absorber la différence.
				</li>
				<li>
					<strong>Friandise</strong> : quantité choisie par vous, pas calculée — c'est un extra, pas
					une variable nutritionnelle.
				</li>
				<li>
					<strong>Croquette</strong> : absorbe le budget calorique restant (DER − pâtée − friandise).
					Si ce budget est déjà négatif, aucune croquette n'est ajoutée et un avertissement s'affiche
					— jamais de quantité négative.
				</li>
				<li>
					Pâtée et friandise sont réparties à parts égales entre leurs créneaux — sauf les créneaux
					verrouillés (ajustés à la main, ou déjà cochés "donné"), qui gardent leur valeur. La
					croquette suit une autre logique, détaillée ci-dessous.
				</li>
			</ol>

			<h3 class="text-sm font-semibold text-foreground">Pourquoi deux croquettes du même jour n'ont pas le même poids</h3>
			<p class="text-sm text-muted-foreground">
				La croquette n'est pas coupée en parts égales entre ses créneaux. Chaque créneau reçoit un
				objectif qui dépend du temps qu'il doit couvrir <strong>jusqu'au prochain repas</strong> (tous
				aliments confondus) :
			</p>
			<p class="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
				objectif du créneau (kcal) = durée jusqu'au repas suivant × (DER / durée pondérée du jour)
			</p>
			<p class="text-sm text-muted-foreground">
				La nuit (22h-7h) compte pour 40% de sa durée réelle dans ce calcul : un long creux pendant que
				le chat dort est normal et ne doit pas gonfler artificiellement le repas qui précède, contrairement
				au même creux en pleine journée. Si un autre aliment (pâtée, friandise) est donné au même horaire
				qu'une croquette, ses kcal sont <strong>déduites de l'objectif avant de peser la croquette</strong> —
				une demi-pâtée à 8h fait directement baisser la portion de croquette de 8h, pas seulement le total
				du jour. Un créneau dont la pâtée couvre déjà tout son objectif reçoit une croquette à 0g, jamais
				négative.
			</p>
			<Alert variant="info" title={`"Jusqu'au prochain repas", pas "depuis le dernier"`}>
				Le repas qui précède un long trou (ex: 13h avant un creux de 7h jusqu'à 20h) est volontairement le
				plus gros de la journée — c'est lui qui doit tenir le chat jusqu'au repas suivant. Le repas de
				20h, lui, n'a qu'à couvrir 3h jusqu'à 23h : il est petit à raison, le trou de 13h-20h a déjà été
				compensé au moment où il a commencé, pas à la fin. Peser aussi par rapport au temps <em>depuis</em>
				le dernier repas reviendrait à reprendre des calories au repas de 13h (déjà responsable de ce
				trou) pour les redonner à 20h — un calcul qui se mordrait la queue sans rien changer au total du
				jour.
			</Alert>
			<p class="text-xs text-muted-foreground">
				Un créneau verrouillé (ajusté à la main via le slider, ou déjà coché "donné") garde toujours sa
				quantité : il n'est jamais recalculé, et sert de point de repère fixe pour peser les créneaux
				encore libres autour de lui.
			</p>
		</Card>

		<Card>
			{#snippet header()}<h2 class="text-lg">4. Vérifier que la ration est équilibrée</h2>{/snippet}
			<p class="text-sm text-foreground">
				Une étiquette ne donne presque jamais un profil nutritionnel complet. L'app compare ce
				qu'elle sait à des valeurs de référence, ramenées à une base commune : le gramme par 1000 kcal
				(pas le % brut de l'étiquette, qui n'est pas comparable entre croquettes et pâtée à cause de
				l'humidité très différente).
			</p>
			<p class="rounded-lg bg-muted px-3 py-2 font-mono text-sm text-foreground">
				nutriment (g/1000kcal) = nutriment total de la ration (g) / kcal totales de la ration × 1000
			</p>

			<div class="overflow-x-auto">
				<table class="w-full min-w-[480px] text-sm">
					<thead>
						<tr class="border-b border-border text-left text-muted-foreground">
							<th class="py-1.5 pr-3 font-medium">Nutriment</th>
							<th class="py-1.5 pr-3 font-medium">Minimum</th>
							<th class="py-1.5 font-medium">Maximum</th>
						</tr>
					</thead>
					<tbody class="text-foreground">
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Protéines</td><td class="pr-3">50 g/1000kcal</td><td>—</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Lipides</td><td class="pr-3">22 g/1000kcal</td><td>—</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Calcium</td><td class="pr-3">1.4 g/1000kcal</td><td>6 g/1000kcal</td></tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Phosphore</td><td class="pr-3">1.3 g/1000kcal</td><td>2.5 g/1000kcal</td></tr>
						<tr class="border-b border-border/50">
							<td class="py-1.5 pr-3">Taurine</td>
							<td class="pr-3">1.0 g/1000kcal (croquette)<br />1.7 g/1000kcal (pâtée)</td>
							<td>—</td>
						</tr>
						<tr class="border-b border-border/50"><td class="py-1.5 pr-3">Ratio Calcium:Phosphore</td><td class="pr-3">1:1</td><td>2:1</td></tr>
						<tr><td class="py-1.5 pr-3">Glucides</td><td class="pr-3">—</td><td>25% de matière sèche ("À surveiller" au-delà, "à éviter si possible" au-delà de 30%)</td></tr>
					</tbody>
				</table>
			</div>

			<div class="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-3.5 py-3">
				<p class="text-sm font-semibold text-foreground">
					Glucides : ce que donnent vraiment les produits du commerce
				</p>
				<p class="text-sm text-muted-foreground">
					L'idéal scientifique (FEDIAF/AAFCO, vétérinaires nutritionnistes comme catinfo.org) reste en
					dessous de 10-12% de matière sèche — c'est quasiment inatteignable pour une croquette
					extrudée classique, y compris "sans céréales" (voir plus bas pourquoi). Les seuils utilisés
					ci-dessus par l'app sont donc des repères d'usage, plus réalistes : en dessous de 25%, c'est
					correct pour du sec ; entre 25 et 30%, un peu élevé ; au-delà de 30%, à éviter si possible.
					Voici des fourchettes observées sur des analyses de produits réels — à titre indicatif,
					chaque paquet a sa propre valeur (voir sa fiche <a href="/aliments" class="underline">Aliments</a>) :
				</p>
				<div class="overflow-x-auto">
					<table class="w-full min-w-[420px] text-sm">
						<thead>
							<tr class="border-b border-border text-left text-muted-foreground">
								<th class="py-1.5 pr-3 font-medium">Catégorie</th>
								<th class="py-1.5 font-medium">Glucides observés (% matière sèche)</th>
							</tr>
						</thead>
						<tbody class="text-foreground">
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3">Croquette premium / "low-carb"</td>
								<td>~15 – 25%</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3">Croquette milieu de gamme</td>
								<td>~25 – 35%</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3">Croquette entrée de gamme</td>
								<td>~35 – 45%</td>
							</tr>
							<tr class="border-b border-border/50">
								<td class="py-1.5 pr-3">Pâtée pur viande, sans céréales</td>
								<td>~0 – 10%</td>
							</tr>
							<tr>
								<td class="py-1.5 pr-3">Pâtée avec céréales/sauce épaissie</td>
								<td>~10 – 25%</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p class="text-xs text-muted-foreground">
					La croquette extrudée classique (l'immense majorité du marché) a besoin structurellement
					d'environ 30 à 45% d'amidon pour tenir sa forme au moment de la fabrication — c'est la
					raison technique pour laquelle quasiment aucune croquette ne descend sous le seuil
					scientifique de 10-12%, pas une question de qualité de la marque. "Sans céréales" ne veut
					pas dire "pauvre en glucides" : le blé/maïs/riz est alors simplement remplacé par une autre
					source d'amidon (pois, pomme de terre, tapioca) qui joue le même rôle de liant — on trouve
					très peu de croquettes sous 15-20% de matière sèche en pratique, céréales ou non. Les rares
					qui s'en approchent utilisent un procédé différent (cru, lyophilisé, cuit à froid), pas
					l'extrusion classique.
				</p>
				<p class="text-xs text-muted-foreground">
					Sources : relevé de produits commerciaux (dont Holistic Select, PRO PLAN, Fancy Feast, Hill's)
					par <a href="https://www.walkervillevet.com.au/blog/carbohydrates-levels-cat-food/" class="underline" target="_blank" rel="noopener">Walkerville Vet</a> ;
					contrainte de fabrication par extrusion documentée par
					<a href="https://www.catmumjournal.co.uk/post/how-to-calculate-carbohydrates-in-cat-food-and-understanding-dry-matter-basis" class="underline" target="_blank" rel="noopener">Cat Mum Journal</a> ;
					Verbrugghe A, Hesta M (2017), <em>"Cats and Carbohydrates: The Carnivore Fantasy?"</em>,
					<a href="https://doi.org/10.3390/vetsci4040055" class="underline" target="_blank" rel="noopener">Veterinary Sciences 4(4):55</a>
					— confirme que les aliments conventionnels apportent 20 à 40% de l'énergie sous forme de
					glucides (jusqu'à 55% pour certains), que le taux d'amidon varie directement avec le
					procédé de fabrication, et que le "sans céréales" n'est pas un gage de faible teneur en
					glucides ; repère "idéal &lt;10%" cohérent avec
					<a href="https://catinfo.org/commercial-cat-foods/" class="underline" target="_blank" rel="noopener">catinfo.org</a> (Dr Lisa Pierson, DVM).
				</p>
			</div>

			<Alert variant="info" title={`"Pas de maximum" ne veut pas dire "pas de risque d'excès"`}>
				Protéines, lipides et taurine n'ont volontairement pas de maximum ici : un chat carnivore
				strict n'a pas besoin d'être limité dessus, et la spec ne fixe pas de borne haute pour ces
				nutriments. Le vrai risque de "trop", c'est l'excès <strong>calorique</strong> total — c'est
				pour ça que la barre kcal / DER en haut de "Repas du jour" est le premier indicateur à
				surveiller, avant le détail par nutriment.
			</Alert>
			<Alert variant="warning" title="Un déficit/excès ne se corrige jamais en changeant la quantité">
				Ces indicateurs sont des <strong>ratios</strong> — g/1000kcal, ou % de matière sèche pour les
				glucides — pas des grammes bruts. Donner plus ou moins de la même nourriture change le total
				de calories et de nutriments dans les mêmes proportions : le ratio reste identique. Seul un
				changement de composition corrige un déficit ou un excès : changer d'aliment, ou ajuster la
				répartition croquette / pâtée (ils n'ont presque jamais le même profil nutritionnel). L'app
				vous le rappelle directement sur "Repas du jour" dès qu'un ratio sort de sa cible, avec un
				chiffre pour situer l'écart (ex: "2,4× la cible") et, pour les glucides, le détail par
				aliment actif pour désigner directement le produit responsable plutôt que de vous laisser
				comparer vous-même.
			</Alert>
			<p class="text-xs text-muted-foreground">
				Calcium, phosphore et taurine sont rarement indiqués sur une étiquette grand public : l'app
				ne les vérifie que si vous les avez saisis pour l'aliment concerné (fiche Aliments). La
				taurine est critique chez le chat — une carence peut causer des maladies cardiaques ou la
				cécité — mais quasi jamais assimilée aussi bien en pâtée qu'en croquette, d'où le seuil plus
				élevé. Les glucides n'ont pas de statut "Déficit"/"Excès" à proprement parler (aucun besoin
				physiologique chez le chat, donc pas de risque de carence), mais l'app affiche "À surveiller"
				au-delà de 25% de matière sèche (un peu élevé), avec une mention "à éviter si possible"
				au-delà de 30% — un indicateur qualité, pas une alerte médicale.
			</p>
			<p class="text-xs text-muted-foreground">
				Si les deux aliments actifs sont marqués "Complet" (norme FEDIAF/AAFCO), le fabricant garantit
				déjà les nutriments non vérifiables par l'app (vitamines, oligo-éléments...).
			</p>
			<p class="text-xs text-muted-foreground">
				Source : recommandations FEDIAF/AAFCO/NRC pour l'entretien du chat adulte (tableau harmonisé,
				FEDIAF a publié une mise à jour en septembre 2024 notamment sur le phosphore inorganique).
			</p>
		</Card>

		<Card>
			{#snippet header()}<h2 class="text-lg">5. Vérifier dans le temps</h2>{/snippet}
			<p class="text-sm text-foreground">
				Le DER calculé est un point de départ théorique, pas une valeur figée. La pratique
				vétérinaire usuelle : on nourrit selon ce calcul pendant 2-3 semaines, on repèse le chat, on
				évalue sa silhouette, puis on ajuste d'environ ±10% si besoin.
			</p>
			<p class="text-sm text-muted-foreground">
				L'onglet <strong>Mes chats → Suivi de poids</strong> vous permet d'enregistrer les pesées de
				votre chat dans le temps. L'app affiche la tendance et vous suggère de revoir la ration si
				elle ne va pas dans le sens de l'objectif — jamais un ajustement automatique, c'est toujours
				vous (et votre vétérinaire) qui décidez.
			</p>
			<p class="text-sm text-muted-foreground">
				Pour appliquer ce correctif, direction <strong>Mes chats</strong> : chaque chat a une rangée de
				boutons "Besoin ajusté" directement sur sa card (−10%, −5%, Normal, +5%, +10%), en un clic, sans
				passer par "Modifier". Ça multiplie directement le DER calculé — une alternative plus directe à
				changer le poids ou le niveau d'activité pour obtenir le même effet — mais gardez toujours une
				trace de la raison dans votre suivi (silhouette, poids), ce correctif n'a de sens que basé sur
				une observation réelle dans le temps, pas comme réglage par défaut.
			</p>
		</Card>

		<Card>
			{#snippet header()}<h2 class="text-lg">Sources</h2>{/snippet}
			<ul class="list-disc space-y-1 pl-5 text-sm text-foreground">
				<li>WSAVA — World Small Animal Veterinary Association, lignes directrices nutritionnelles.</li>
				<li>AAHA — American Animal Hospital Association.</li>
				<li>NRC — National Research Council, "Nutrient Requirements of Dogs and Cats".</li>
				<li>FEDIAF — European Pet Food Industry Federation, guide nutritionnel (mise à jour 09/2024).</li>
				<li>AAFCO — Association of American Feed Control Officials, "Guaranteed Analysis" et profils nutritionnels.</li>
				<li>
					Verbrugghe A, Hesta M (2017), "Cats and Carbohydrates: The Carnivore Fantasy?", Veterinary
					Sciences 4(4):55 — <a href="https://doi.org/10.3390/vetsci4040055" class="underline" target="_blank" rel="noopener">doi.org/10.3390/vetsci4040055</a>.
				</li>
				<li>
					Walkerville Vet — relevé de teneur en glucides de produits commerciaux (croquettes et
					pâtées) : <a href="https://www.walkervillevet.com.au/blog/carbohydrates-levels-cat-food/" class="underline" target="_blank" rel="noopener">walkervillevet.com.au</a>.
				</li>
				<li>
					Cat Mum Journal — méthode de calcul en matière sèche et contrainte de l'extrusion :
					<a href="https://www.catmumjournal.co.uk/post/how-to-calculate-carbohydrates-in-cat-food-and-understanding-dry-matter-basis" class="underline" target="_blank" rel="noopener">catmumjournal.co.uk</a>.
				</li>
			</ul>
		</Card>
	</div>
</div>
