/**
 * Simule 12 mois d'utilisation réelle de l'app pour le chat actif (routine active courante appliquée
 * rétroactivement, avec variations réalistes jour par jour) : remplit `meal_entry` et `cat_weight_log`
 * du jour J-365 à J-2 (les entrées de J-1/J déjà générées par l'app ne sont jamais touchées).
 *
 * Réimplémentation locale des formules de src/lib/domain/{nutrition,repartition}.calc.ts : ce script
 * tourne hors du bundle SvelteKit et ne peut pas résoudre les alias `$lib` (cf. recompute-em-estimates.mjs).
 *
 * Usage : node scripts/simulate-12-months.mjs [--apply]
 *   sans --apply : affiche un résumé sans rien écrire (dry-run par défaut).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import postgres from 'postgres';

const APPLY = process.argv.includes('--apply');

function loadDotEnv(path) {
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
		if (!match) continue;
		const key = match[1];
		let value = (match[2] ?? '').trim();
		if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
		if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
		if (!(key in process.env)) process.env[key] = value;
	}
}

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
loadDotEnv(join(projectRoot, '.env'));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error('DATABASE_URL manquant (voir .env).');
	process.exit(1);
}

// --- Réimplémentation locale de nutrition.calc.ts (RER/DER) ---

function calculerRER(poidsKg) {
	if (poidsKg < 2 || poidsKg > 15) return 70 * Math.pow(poidsKg, 0.75);
	return 30 * poidsKg + 70;
}

function calculerDER(rer, facteur) {
	return rer * facteur;
}

function positionDansPlage(min, max, activityLevel, hasOutdoorAccess) {
	let t = activityLevel === 'faible' ? 0 : activityLevel === 'eleve' ? 1 : 0.5;
	if (hasOutdoorAccess === false) t = Math.max(0, t - 0.25);
	return Math.round((min + (max - min) * t) * 100) / 100;
}

function resoudreFacteurDER({ ageMonths, sterilized, activityLevel, hasOutdoorAccess }) {
	if (ageMonths !== null && ageMonths < 4) return positionDansPlage(2.5, 3.0, activityLevel, hasOutdoorAccess);
	if (ageMonths !== null && ageMonths < 12) return 2.0;
	if (ageMonths !== null && ageMonths >= 84) {
		if (activityLevel === 'faible') return 1.0;
		return positionDansPlage(1.1, 1.4, activityLevel, hasOutdoorAccess);
	}
	if (sterilized === true) {
		if (activityLevel === 'faible') return positionDansPlage(1.0, 1.2, null, hasOutdoorAccess);
		return positionDansPlage(1.2, 1.4, activityLevel, hasOutdoorAccess);
	}
	if (sterilized === false) return 1.4;
	return 1.2;
}

function arrondirGrammes(g) {
	return Math.round(g * 2) / 2;
}

// --- Réimplémentation locale de repartition.calc.ts (simplifiée : pâtée à nombre de paquets fixé si
// override renseigné, sinon calcul auto ; croquette absorbe le reste ; répartition égale par créneau) ---

function calculerNombrePaquetsPatee(cibleKcal, kcalParPaquet) {
	if (kcalParPaquet <= 0) return 0;
	const demiPaquets = Math.max(1, Math.round((cibleKcal / kcalParPaquet) * 2));
	return demiPaquets / 2;
}

function repartirPaquetEnParts(totalG, nombreParts) {
	if (nombreParts <= 0) return [];
	const partBrute = totalG / nombreParts;
	const parts = Array(nombreParts).fill(arrondirGrammes(partBrute));
	const sommeArrondie = parts.reduce((s, p) => s + p, 0);
	const ecart = totalG - sommeArrondie;
	parts[nombreParts - 1] = arrondirGrammes(parts[nombreParts - 1] + ecart);
	return parts;
}

const sql = postgres(connectionString);

function seededRandom(seed) {
	let s = seed % 2147483647;
	if (s <= 0) s += 2147483646;
	return () => {
		s = (s * 16807) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

try {
	const [cat] = await sql`select * from cat limit 1`;
	if (!cat) throw new Error('Aucun chat en base — rien à simuler.');

	const dailyPlan = (await sql`select * from daily_plan where cat_id = ${cat.id} and is_active = true limit 1`)[0];
	if (!dailyPlan) throw new Error('Aucune routine active pour ce chat — rien à simuler.');

	const slots = await sql`
		select * from daily_plan_slot where daily_plan_id = ${dailyPlan.id} order by position
	`;
	if (slots.length === 0) throw new Error('La routine active ne contient aucun créneau.');

	const croquette = cat.active_croquette_food_id
		? (await sql`select * from food where id = ${cat.active_croquette_food_id}`)[0]
		: null;
	const patee = cat.active_patee_food_id
		? (await sql`select * from food where id = ${cat.active_patee_food_id}`)[0]
		: null;
	const friandise = cat.active_friandise_food_id
		? (await sql`select * from food where id = ${cat.active_friandise_food_id}`)[0]
		: null;

	const users = await sql`select id from "user"`;
	if (users.length === 0) throw new Error('Aucun utilisateur en base.');
	const userIds = users.map((u) => u.id);

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// On ne touche jamais aux 2 derniers jours (déjà générés par l'app elle-même via son propre flux).
	const lastSimulatedDay = new Date(today);
	lastSimulatedDay.setDate(lastSimulatedDay.getDate() - 2);
	const firstSimulatedDay = new Date(today);
	firstSimulatedDay.setDate(firstSimulatedDay.getDate() - 365);

	const rng = seededRandom(42);

	// Poids simulé sur 12 mois : léger surpoids il y a un an, stabilisation progressive vers le poids
	// actuel (weight_kg), avec du bruit journalier réaliste — sert à donner du relief au suivi de poids.
	const poidsActuelKg = Number(cat.weight_kg);
	const poidsDepartKg = poidsActuelKg + 0.35;

	const ageAujourdhuiMs = cat.birth_date ? today.getTime() - new Date(cat.birth_date).getTime() : null;

	const weightLogRows = [];
	const mealEntryRows = [];

	let jour = new Date(firstSimulatedDay);
	let dayIndex = 0;
	const totalDays = Math.round((lastSimulatedDay - firstSimulatedDay) / 86400000);

	while (jour <= lastSimulatedDay) {
		const progress = totalDays > 0 ? dayIndex / totalDays : 1;
		const ageMonthsCeJour = ageAujourdhuiMs
			? Math.max(0, Math.floor((ageAujourdhuiMs - (totalDays - dayIndex) * 86400000) / (30.44 * 86400000)))
			: null;

		const facteur = resoudreFacteurDER({
			ageMonths: ageMonthsCeJour,
			sterilized: cat.sterilized,
			activityLevel: cat.activity_level,
			hasOutdoorAccess: cat.has_outdoor_access
		});

		// Poids interpolé + bruit journalier (+/- 40g), jamais en dessous de 80% du poids actuel.
		const poidsBaseCeJour = poidsDepartKg + (poidsActuelKg - poidsDepartKg) * progress;
		const bruitPoids = (rng() - 0.5) * 0.08;
		const poidsCeJourKg = Math.max(poidsActuelKg * 0.8, poidsBaseCeJour + bruitPoids);

		const rer = calculerRER(poidsCeJourKg);
		const der = calculerDER(rer, facteur);

		// Variation réaliste jour à jour de l'appétit (+/- 8%).
		const derDuJour = der * (1 + (rng() - 0.5) * 0.16);

		let friandiseTotalG = 0;
		let friandiseTotalKcal = 0;
		if (friandise && cat.friandise_quantite_totale_g) {
			friandiseTotalG = Number(cat.friandise_quantite_totale_g);
			friandiseTotalKcal = (friandiseTotalG / 100) * Number(friandise.em_kcal_100g);
		}

		const budgetPrincipauxKcal = derDuJour - friandiseTotalKcal;

		let pateeTotalG = 0;
		let pateeTotalKcal = 0;
		if (patee) {
			let nombrePaquets;
			if (cat.patee_nombre_paquets_override) {
				nombrePaquets = Number(cat.patee_nombre_paquets_override);
			} else {
				const kcalParPaquet = (Number(patee.package_size_g) / 100) * Number(patee.em_kcal_100g);
				const budgetPateeKcal = croquette ? budgetPrincipauxKcal * 0.5 : budgetPrincipauxKcal;
				nombrePaquets = calculerNombrePaquetsPatee(budgetPateeKcal, kcalParPaquet);
			}
			pateeTotalG = nombrePaquets * Number(patee.package_size_g);
			pateeTotalKcal = (pateeTotalG / 100) * Number(patee.em_kcal_100g);
		}

		let croquetteTotalG = 0;
		if (croquette) {
			const budgetKcal = Math.max(0, derDuJour - pateeTotalKcal - friandiseTotalKcal);
			croquetteTotalG = arrondirGrammes(budgetKcal / (Number(croquette.em_kcal_100g) / 100));
		}

		const totauxParType = { patee: pateeTotalG, croquette: croquetteTotalG, friandise: friandiseTotalG };
		const foodIdParType = { patee: patee?.id, croquette: croquette?.id, friandise: friandise?.id };

		for (const foodType of ['patee', 'croquette', 'friandise']) {
			const slotsType = slots.filter((s) => s.food_type === foodType);
			if (slotsType.length === 0 || !foodIdParType[foodType]) continue;

			const parts = repartirPaquetEnParts(totauxParType[foodType], slotsType.length);

			slotsType.forEach((slot, i) => {
				// ~3% de chance qu'un créneau ait été oublié ce jour-là (réalisme : personne n'est parfait
				// pendant 12 mois) — sauf distributeur automatique, qui ne dépend d'aucune action manuelle.
				const oublie = slot.distribution_mode !== 'distributeur_automatique' && rng() < 0.03;
				if (oublie || parts[i] <= 0) return;

				const [hh, mm] = slot.time_of_day.split(':').map(Number);
				const consumedAt = new Date(jour);
				consumedAt.setHours(hh, mm, 0, 0);

				mealEntryRows.push({
					id: crypto.randomUUID(),
					cat_id: cat.id,
					food_id: foodIdParType[foodType],
					quantity_g: parts[i].toFixed(2),
					locked: true,
					validated: true,
					validated_by_user_id: userIds[Math.floor(rng() * userIds.length)],
					validated_at: consumedAt,
					consumed_at: consumedAt,
					recorded_by_user_id: userIds[Math.floor(rng() * userIds.length)],
					source_daily_plan_slot_id: slot.id
				});
			});
		}

		// Pesée hebdomadaire (tous les 7 jours), au petit matin.
		if (dayIndex % 7 === 0) {
			const recordedAt = new Date(jour);
			weightLogRows.push({
				id: crypto.randomUUID(),
				cat_id: cat.id,
				weight_kg: poidsCeJourKg.toFixed(2),
				recorded_at: recordedAt.toISOString().slice(0, 10),
				recorded_by_user_id: userIds[Math.floor(rng() * userIds.length)]
			});
		}

		jour.setDate(jour.getDate() + 1);
		dayIndex++;
	}

	console.log(`Chat : ${cat.name} (${cat.id})`);
	console.log(`Période simulée : ${firstSimulatedDay.toISOString().slice(0, 10)} → ${lastSimulatedDay.toISOString().slice(0, 10)}`);
	console.log(`Repas générés : ${mealEntryRows.length}`);
	console.log(`Pesées générées : ${weightLogRows.length}`);

	if (!APPLY) {
		console.log('\nDry-run (rien écrit). Relancer avec --apply pour insérer en base.');
		process.exit(0);
	}

	await sql.begin(async (tx) => {
		for (const chunk of chunkArray(mealEntryRows, 500)) {
			await tx`insert into meal_entry ${tx(
				chunk,
				'id',
				'cat_id',
				'food_id',
				'quantity_g',
				'locked',
				'validated',
				'validated_by_user_id',
				'validated_at',
				'consumed_at',
				'recorded_by_user_id',
				'source_daily_plan_slot_id'
			)}`;
		}
		for (const chunk of chunkArray(weightLogRows, 500)) {
			await tx`insert into cat_weight_log ${tx(chunk, 'id', 'cat_id', 'weight_kg', 'recorded_at', 'recorded_by_user_id')}`;
		}
	});

	console.log('\nInséré en base avec succès.');
} finally {
	await sql.end();
}

function chunkArray(arr, size) {
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}
