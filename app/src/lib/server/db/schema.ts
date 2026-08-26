import { relations } from 'drizzle-orm';
import {
	pgTable,
	text,
	timestamp,
	boolean,
	index,
	numeric,
	date,
	pgEnum,
	integer
} from 'drizzle-orm/pg-core';

// --- Better Auth tables (generated via `npx @better-auth/cli generate`) ---

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		issuer: text('issuer'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

// --- Domain tables (chats, produits, journal) ---

export const catSex = pgEnum('cat_sex', ['male', 'femelle']);
export const catActivityLevel = pgEnum('cat_activity_level', ['faible', 'modere', 'eleve']);
export const catSpecialCondition = pgEnum('cat_special_condition', [
	'aucune',
	'gestation',
	'croissance',
	'surpoids'
]);

export const cat = pgTable(
	'cat',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		weightKg: numeric('weight_kg', { precision: 5, scale: 2 }).notNull(),
		birthDate: date('birth_date'),
		sex: catSex('sex').notNull(),
		sterilized: boolean('sterilized').notNull(),
		activityLevel: catActivityLevel('activity_level').notNull(),
		// Distinct du niveau d'activité (specs/nutrition-spec.md section 1.2) : un chat d'intérieur strict
		// dépense moins d'énergie qu'un chat qui sort, même à niveau d'activité perçu identique — tire le
		// facteur DER vers le bas indépendamment de activityLevel.
		hasOutdoorAccess: boolean('has_outdoor_access').default(false).notNull(),
		specialCondition: catSpecialCondition('special_condition').notNull(),
		// Sélection persistante des aliments donnés "en ce moment" à ce chat (modifiable à tout moment
		// depuis la home, jamais re-demandée à chaque génération du menu du jour). Au moins un des deux
		// (croquette/pâtée) doit être renseigné — contrainte vérifiée en service, pas en DB.
		activeCroquetteFoodId: text('active_croquette_food_id').references(() => food.id, {
			onDelete: 'set null'
		}),
		activePateeFoodId: text('active_patee_food_id').references(() => food.id, { onDelete: 'set null' }),
		activeFriandiseFoodId: text('active_friandise_food_id').references(() => food.id, {
			onDelete: 'set null'
		}),
		// Quantité de friandise donnée par jour (g) : à la différence de la pâtée/croquette, ce n'est
		// pas calculé (la friandise est un extra choisi par l'utilisateur, pas une variable nutritionnelle).
		friandiseQuantiteTotaleG: numeric('friandise_quantite_totale_g', { precision: 6, scale: 2 }),
		// Nombre de paquets de pâtée/jour choisi explicitement par l'utilisateur (pas de quart/tiers,
		// cf. arrondirAuDemiPaquet) : remplace le calcul automatique basé sur le DER tant qu'il est
		// renseigné (specs/nutrition-spec.md section 3, Cas A — quantité fixée par l'utilisateur).
		// Null = comportement par défaut, calculé automatiquement pour couvrir le DER.
		pateeNombrePaquetsOverride: numeric('patee_nombre_paquets_override', { precision: 4, scale: 1 }),
		// Ajustement manuel du DER en %, réservé au suivi de poids dans le temps (specs/nutrition-spec.md
		// section 5 : "on nourrit selon ce calcul 2-3 semaines, on repèse, on ajuste d'environ ±10% si
		// besoin"). Toujours choisi explicitement par l'utilisateur — jamais recalculé automatiquement par
		// l'app à partir des pesées, cf. CAT_DER_AJUSTEMENT_PCT_VALEURS (cat.calc.ts) pour les valeurs
		// autorisées (-10, -5, 0, 5, 10).
		derAjustementPct: integer('der_ajustement_pct').default(0).notNull(),
		createdByUserId: text('created_by_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('cat_createdByUserId_idx').on(table.createdByUserId)]
);

export const catMember = pgTable(
	'cat_member',
	{
		id: text('id').primaryKey(),
		catId: text('cat_id')
			.notNull()
			.references(() => cat.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		joinedAt: timestamp('joined_at').defaultNow().notNull()
	},
	(table) => [
		index('cat_member_catId_idx').on(table.catId),
		index('cat_member_userId_idx').on(table.userId)
	]
);

export const catRelations = relations(cat, ({ one, many }) => ({
	createdBy: one(user, {
		fields: [cat.createdByUserId],
		references: [user.id]
	}),
	members: many(catMember),
	weightLogs: many(catWeightLog),
	activeCroquetteFood: one(food, {
		fields: [cat.activeCroquetteFoodId],
		references: [food.id],
		relationName: 'catActiveCroquetteFood'
	}),
	activePateeFood: one(food, {
		fields: [cat.activePateeFoodId],
		references: [food.id],
		relationName: 'catActivePateeFood'
	}),
	activeFriandiseFood: one(food, {
		fields: [cat.activeFriandiseFoodId],
		references: [food.id],
		relationName: 'catActiveFriandiseFood'
	})
}));

// --- Suivi de poids (section "point de départ, pas une prescription figée" — le DER théorique se
// vérifie par le poids réel du chat dans le temps, pas seulement par le calcul initial) ---

export const catWeightLog = pgTable(
	'cat_weight_log',
	{
		id: text('id').primaryKey(),
		catId: text('cat_id')
			.notNull()
			.references(() => cat.id, { onDelete: 'cascade' }),
		weightKg: numeric('weight_kg', { precision: 5, scale: 2 }).notNull(),
		recordedAt: date('recorded_at').notNull(),
		recordedByUserId: text('recorded_by_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('cat_weight_log_catId_idx').on(table.catId),
		index('cat_weight_log_recordedAt_idx').on(table.recordedAt)
	]
);

export const catWeightLogRelations = relations(catWeightLog, ({ one }) => ({
	cat: one(cat, {
		fields: [catWeightLog.catId],
		references: [cat.id]
	}),
	recordedBy: one(user, {
		fields: [catWeightLog.recordedByUserId],
		references: [user.id]
	})
}));

export const catMemberRelations = relations(catMember, ({ one }) => ({
	cat: one(cat, {
		fields: [catMember.catId],
		references: [cat.id]
	}),
	user: one(user, {
		fields: [catMember.userId],
		references: [user.id]
	})
}));

// --- Catalogue produits ---

export const foodType = pgEnum('food_type', ['croquette', 'patee', 'friandise']);
export const foodLegalStatus = pgEnum('food_legal_status', ['complet', 'complementaire']);

export const food = pgTable(
	'food',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		brand: text('brand').notNull(),
		type: foodType('type').notNull(),
		emKcal100g: numeric('em_kcal_100g', { precision: 6, scale: 2 }),
		// true = EM calculée par l'équation NRC 2006 à partir de l'analyse nutritionnelle, pas déclarée
		// par le fabricant. Cas nominal et non marginal : l'EM n'est pas obligatoire sur une étiquette UE.
		// Persisté pour rester visible partout où l'EM est utilisée, pas seulement au moment de la saisie
		// (le calcul de ration en aval en dépend directement).
		emEstimee: boolean('em_estimee').default(false).notNull(),
		// Poids d'un paquet/sachet commercial, en grammes. Utilisé pour la pâtée : permet de fractionner
		// un paquet en parts égales entre les repas de la journée plutôt que de saisir une quantité libre.
		packageSizeG: numeric('package_size_g', { precision: 6, scale: 2 }),
		// Poids d'une dose/cup du distributeur automatique, en grammes — les distributeurs comptent en
		// doses, pas en grammes. Renseigné uniquement pour une croquette utilisée avec un distributeur
		// automatique (routine avec distributionMode='distributeur_automatique') : permet à la répartition
		// du menu du jour d'arrondir chaque créneau distributeur à un nombre entier de doses (cf.
		// alignerDosesDistributeur, repartition.calc.ts).
		doseDistributeurG: numeric('dose_distributeur_g', { precision: 6, scale: 2 }),
		proteinesG100g: numeric('proteines_g_100g', { precision: 5, scale: 2 }).notNull(),
		lipidesG100g: numeric('lipides_g_100g', { precision: 5, scale: 2 }).notNull(),
		// Contrairement à protéines/lipides/fibres/cendres, l'humidité n'est PAS légalement obligatoire
		// sur une étiquette UE en dessous de 14% — quasiment jamais présente pour une croquette sèche.
		// Nullable : absente, l'app applique un défaut générique par type d'aliment (humiditeEstimee=true).
		humiditeG100g: numeric('humidite_g_100g', { precision: 5, scale: 2 }),
		humiditeEstimee: boolean('humidite_estimee').default(false).notNull(),
		// Fibres brutes et cendres brutes sont, avec protéines/lipides, les 4 constituants analytiques
		// légalement obligatoires sur une étiquette UE d'aliment complet — toujours présents en pratique.
		fibresG100g: numeric('fibres_g_100g', { precision: 5, scale: 2 }).notNull(),
		cendresG100g: numeric('cendres_g_100g', { precision: 5, scale: 2 }).notNull(),
		glucidesG100g: numeric('glucides_g_100g', { precision: 5, scale: 2 }),
		// true = glucides calculés par différence (100 - protéines - lipides - cendres - humidité -
		// fibres), pas déclarés par le fabricant — la valeur hérite de toute imprécision amont (dont
		// l'humidité estimée le cas échéant), donc moins fiable qu'une EM estimée seule.
		glucidesEstimes: boolean('glucides_estimes').default(false).notNull(),
		// Rarement indiqués sur une étiquette grand public (specs/nutrition-spec.md section 6.1) : nullable,
		// utilisés dans la validation de ration uniquement quand renseignés (jamais d'estimation silencieuse).
		calciumG100g: numeric('calcium_g_100g', { precision: 5, scale: 3 }),
		phosphoreG100g: numeric('phosphore_g_100g', { precision: 5, scale: 3 }),
		taurineG100g: numeric('taurine_g_100g', { precision: 5, scale: 3 }),
		statutLegal: foodLegalStatus('statut_legal').notNull(),
		createdByUserId: text('created_by_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('food_createdByUserId_idx').on(table.createdByUserId)]
);

export const foodRelations = relations(food, ({ one }) => ({
	createdBy: one(user, {
		fields: [food.createdByUserId],
		references: [user.id]
	})
}));

// --- Journée type (modèle de repas récurrents par chat) ---

export const dailyPlan = pgTable(
	'daily_plan',
	{
		id: text('id').primaryKey(),
		catId: text('cat_id')
			.notNull()
			.references(() => cat.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		// Une seule journée type active à la fois par chat (appliquée pour générer le journal du jour).
		isActive: boolean('is_active').default(false).notNull(),
		createdByUserId: text('created_by_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('daily_plan_catId_idx').on(table.catId)]
);

export const distributionMode = pgEnum('distribution_mode', [
	'gamelle',
	'distributeur_automatique',
	'gamelle_ludique'
]);

export const dailyPlanSlot = pgTable(
	'daily_plan_slot',
	{
		id: text('id').primaryKey(),
		dailyPlanId: text('daily_plan_id')
			.notNull()
			.references(() => dailyPlan.id, { onDelete: 'cascade' }),
		// Heure du créneau, format 'HH:MM'. Plusieurs créneaux peuvent partager la même heure
		// (ex. gamelle + distributeur automatique en simultané) : différenciés par leur mode de
		// distribution, jamais fusionnés.
		timeOfDay: text('time_of_day').notNull(),
		// Type d'aliment fixe pour ce créneau (un seul aliment par créneau, assigné dans la routine).
		// La quantité n'est jamais fixée ici : elle est calculée chaque jour (répartition égale par
		// défaut entre les créneaux du même type, cf. domain/repartition.calc.ts).
		foodType: foodType('food_type').notNull().default('croquette'),
		distributionMode: distributionMode('distribution_mode').notNull().default('gamelle'),
		position: integer('position').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('daily_plan_slot_dailyPlanId_idx').on(table.dailyPlanId)]
);

export const dailyPlanRelations = relations(dailyPlan, ({ one, many }) => ({
	cat: one(cat, {
		fields: [dailyPlan.catId],
		references: [cat.id]
	}),
	slots: many(dailyPlanSlot)
}));

export const dailyPlanSlotRelations = relations(dailyPlanSlot, ({ one }) => ({
	dailyPlan: one(dailyPlan, {
		fields: [dailyPlanSlot.dailyPlanId],
		references: [dailyPlan.id]
	})
}));

// --- Journal des repas ---

export const mealEntry = pgTable(
	'meal_entry',
	{
		id: text('id').primaryKey(),
		catId: text('cat_id')
			.notNull()
			.references(() => cat.id, { onDelete: 'cascade' }),
		foodId: text('food_id')
			.notNull()
			.references(() => food.id, { onDelete: 'cascade' }),
		// Nullable : non saisie manuellement, calculée plus tard par le moteur de répartition.
		quantityG: numeric('quantity_g', { precision: 6, scale: 2 }),
		// Verrouillé dès que l'utilisateur ajuste ce créneau via le slider (ou qu'il est coché "donné") :
		// le moteur de répartition ne recalcule plus jamais sa quantité, seuls les créneaux non
		// verrouillés du même type se partagent le reste du besoin (specs section 3.4).
		locked: boolean('locked').default(false).notNull(),
		// Coché par l'utilisateur une fois le repas effectivement donné : quantité définitivement figée,
		// jamais recalculée rétroactivement même si on ajuste un autre créneau.
		validated: boolean('validated').default(false).notNull(),
		validatedByUserId: text('validated_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		validatedAt: timestamp('validated_at'),
		consumedAt: timestamp('consumed_at').notNull(),
		recordedByUserId: text('recorded_by_user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		// Renseigné quand l'entrée a été générée depuis une journée type (évite les doublons de génération).
		sourceDailyPlanSlotId: text('source_daily_plan_slot_id').references(() => dailyPlanSlot.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('meal_entry_catId_idx').on(table.catId),
		index('meal_entry_foodId_idx').on(table.foodId),
		index('meal_entry_consumedAt_idx').on(table.consumedAt)
	]
);

export const mealEntryRelations = relations(mealEntry, ({ one }) => ({
	cat: one(cat, {
		fields: [mealEntry.catId],
		references: [cat.id]
	}),
	food: one(food, {
		fields: [mealEntry.foodId],
		references: [food.id]
	}),
	recordedBy: one(user, {
		fields: [mealEntry.recordedByUserId],
		references: [user.id]
	}),
	validatedBy: one(user, {
		fields: [mealEntry.validatedByUserId],
		references: [user.id],
		relationName: 'mealEntryValidatedBy'
	}),
	sourceDailyPlanSlot: one(dailyPlanSlot, {
		fields: [mealEntry.sourceDailyPlanSlotId],
		references: [dailyPlanSlot.id]
	})
}));
