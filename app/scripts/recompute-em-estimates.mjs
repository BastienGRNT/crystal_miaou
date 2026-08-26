/**
 * Recalcule l'EM (kcal/100g) des aliments dont la valeur est estimée (`em_estimee = true`).
 *
 * À lancer une fois après le passage de l'Atwater modifiée à l'équation NRC 2006 : les lignes déjà
 * en base portent l'ancienne estimation, qui ne serait rafraîchie qu'à la prochaine sauvegarde
 * manuelle de chaque aliment.
 *
 * Ne touche jamais une EM déclarée par l'utilisateur (`em_estimee = false`) : c'est une valeur
 * fabricant, pas une estimation à recalculer.
 *
 * Usage : node scripts/recompute-em-estimates.mjs [--apply]
 *   sans --apply : affiche les changements sans rien écrire (dry-run par défaut).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import postgres from 'postgres';

const APPLY = process.argv.includes('--apply');

// Pas de dépendance dotenv dans ce projet (SvelteKit/Vite charge .env pour l'app, pas pour ce script
// autonome) : on lit le fichier soi-même plutôt que d'ajouter une dépendance pour un seul script.
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

// Réimplémentation locale de estimerEMNRC2006 / calculerGlucidesParDifference : ce script tourne hors
// du bundle SvelteKit et ne peut pas résoudre les alias `$lib`. Toute évolution des formules dans
// src/lib/domain/nutrition.calc.ts doit être répercutée ici.
function calculerGlucidesParDifference({ proteinesG, lipidesG, cendresG, humiditeG, fibresG }) {
	return Math.max(100 - proteinesG - lipidesG - cendresG - humiditeG - fibresG, 0);
}

function estimerEMNRC2006({ proteinesG, lipidesG, glucidesG, humiditeG, fibresG }) {
	const matiereSecheG = 100 - humiditeG;
	const fibresPctMatiereSeche = matiereSecheG > 0 ? (fibresG / matiereSecheG) * 100 : 0;
	const energieBrute = proteinesG * 5.7 + lipidesG * 9.4 + (glucidesG + fibresG) * 4.1;
	const digestibilite = Math.max(0, Math.min(100, 87.9 - 0.88 * fibresPctMatiereSeche));
	const energieDigestible = (energieBrute * digestibilite) / 100;
	return Math.max(0, energieDigestible - 0.77 * proteinesG);
}

const sql = postgres(connectionString);

try {
	const foods = await sql`
		select id, name, brand, em_kcal_100g, proteines_g_100g, lipides_g_100g,
		       humidite_g_100g, fibres_g_100g, cendres_g_100g, glucides_g_100g, glucides_estimes
		from food
		where em_estimee = true
	`;

	if (foods.length === 0) {
		console.log('Aucun aliment avec une EM estimée — rien à faire.');
		process.exit(0);
	}

	const updates = [];

	for (const food of foods) {
		const proteinesG = Number(food.proteines_g_100g);
		const lipidesG = Number(food.lipides_g_100g);
		const humiditeG = Number(food.humidite_g_100g);
		const fibresG = Number(food.fibres_g_100g);
		const cendresG = Number(food.cendres_g_100g);

		// Une valeur de glucides estimée est recalculée par différence, une valeur saisie est respectée.
		const glucidesG = food.glucides_estimes
			? calculerGlucidesParDifference({ proteinesG, lipidesG, cendresG, humiditeG, fibresG })
			: Number(food.glucides_g_100g);

		const ancien = Number(food.em_kcal_100g);
		const nouveau = estimerEMNRC2006({ proteinesG, lipidesG, glucidesG, humiditeG, fibresG });
		const arrondi = Math.round(nouveau * 100) / 100;

		if (Math.abs(arrondi - ancien) < 0.01) continue;

		const ecartPct = ((arrondi - ancien) / ancien) * 100;
		console.log(
			`${food.brand} — ${food.name} : ${ancien.toFixed(2)} → ${arrondi.toFixed(2)} kcal/100g ` +
				`(${ecartPct >= 0 ? '+' : ''}${ecartPct.toFixed(1)}%)`
		);
		updates.push({ id: food.id, emKcal100g: arrondi });
	}

	if (updates.length === 0) {
		console.log('Toutes les estimations sont déjà à jour.');
	} else if (!APPLY) {
		console.log(`\n${updates.length} aliment(s) à mettre à jour. Relancer avec --apply pour écrire.`);
	} else {
		for (const { id, emKcal100g } of updates) {
			await sql`update food set em_kcal_100g = ${emKcal100g}, updated_at = now() where id = ${id}`;
		}
		console.log(`\n${updates.length} aliment(s) mis à jour.`);
	}
} finally {
	await sql.end();
}
