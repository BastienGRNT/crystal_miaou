import { describe, expect, it } from 'vitest';
import {
	arrondirGrammes,
	calculerDER,
	calculerPctMatiereSeche,
	calculerRatioEcartSeuil,
	calculerRER,
	convertirNutrimentPour1000kcal,
	estimerEMAtwater,
	resoudreFacteurDER,
	validerRation,
	type DERFactorProfile
} from './nutrition.calc';

describe('calculerPctMatiereSeche', () => {
	it('rapporte le nutriment à la matière sèche (100g - humidité)', () => {
		// croquette 8% humidité, 40g glucides/100g -> matière sèche 92g -> 40/92*100
		expect(calculerPctMatiereSeche(40, 8)).toBeCloseTo(43.48, 2);
	});

	it('retourne 0 si humidité >= 100 (donnée aberrante, jamais de division par 0)', () => {
		expect(calculerPctMatiereSeche(10, 100)).toBe(0);
	});
});

describe('calculerRatioEcartSeuil', () => {
	it("retourne null quand la valeur respecte la cible", () => {
		expect(calculerRatioEcartSeuil(60, { min: 50, max: null })).toBeNull();
	});

	it('calcule le multiple au-dessus du max franchi', () => {
		expect(calculerRatioEcartSeuil(28.3, { min: null, max: 12 })).toBeCloseTo(2.358, 3);
	});

	it('calcule la fraction du minimum non atteint', () => {
		expect(calculerRatioEcartSeuil(43, { min: 50, max: null })).toBeCloseTo(0.86, 2);
	});
});

describe('calculerRER', () => {
	it('utilise la formule linéaire dans la plage normale (2-15kg)', () => {
		expect(calculerRER(4)).toBe(190); // 30*4+70
	});

	it('bascule sur la formule allométrique en dessous de 2kg', () => {
		expect(calculerRER(1)).toBeCloseTo(70 * Math.pow(1, 0.75), 6);
	});

	it('bascule sur la formule allométrique au-dessus de 15kg (chat très obèse, cas rare)', () => {
		expect(calculerRER(20)).toBeCloseTo(70 * Math.pow(20, 0.75), 6);
	});

	it('utilise encore la formule linéaire aux bornes (2kg et 15kg)', () => {
		expect(calculerRER(2)).toBe(130); // 30*2+70
		expect(calculerRER(15)).toBe(520); // 30*15+70
	});
});

describe('calculerDER', () => {
	it('multiplie le RER par le facteur', () => {
		expect(calculerDER(200, 1.2)).toBeCloseTo(240, 6);
	});

	it('applique le correctif manuel en % quand fourni, 0 par défaut', () => {
		expect(calculerDER(200, 1.2, 10)).toBeCloseTo(264, 6); // 240 * 1.10
		expect(calculerDER(200, 1.2, -10)).toBeCloseTo(216, 6); // 240 * 0.90
		expect(calculerDER(200, 1.2, 0)).toBeCloseTo(calculerDER(200, 1.2), 6);
	});
});

describe('resoudreFacteurDER', () => {
	const profilVide: DERFactorProfile = {
		ageMonths: null,
		sterilized: null,
		activityLevel: null,
		goal: null,
		reproductiveStatus: null,
		hasOutdoorAccess: null
	};

	it('retourne le défaut 1.2 pour un profil incomplet', () => {
		expect(resoudreFacteurDER(profilVide)).toBe(1.2);
	});

	it('chaton 0-4 mois : positionne dans la plage 2.5-3.0 selon activité', () => {
		expect(
			resoudreFacteurDER({ ...profilVide, ageMonths: 2, activityLevel: 'faible' })
		).toBe(2.5);
		expect(
			resoudreFacteurDER({ ...profilVide, ageMonths: 2, activityLevel: 'eleve' })
		).toBe(3.0);
		expect(
			resoudreFacteurDER({ ...profilVide, ageMonths: 2, activityLevel: 'modere' })
		).toBe(2.75);
	});

	it('chaton 4-12 mois : facteur fixe 2.0', () => {
		expect(resoudreFacteurDER({ ...profilVide, ageMonths: 8 })).toBe(2.0);
	});

	it('gestation : positionne dans la plage 1.6-2.0 selon activité, prioritaire sur senior/objectif', () => {
		expect(
			resoudreFacteurDER({
				...profilVide,
				ageMonths: 100,
				goal: 'perte',
				reproductiveStatus: 'gestation',
				activityLevel: 'faible'
			})
		).toBe(1.6);
	});

	it('objectif perte de poids : positionne dans la plage 0.8-1.0', () => {
		expect(resoudreFacteurDER({ ...profilVide, goal: 'perte', activityLevel: 'eleve' })).toBe(1.0);
	});

	it('objectif prise de poids : positionne dans la plage 1.2-1.8', () => {
		expect(resoudreFacteurDER({ ...profilVide, goal: 'prise', activityLevel: 'faible' })).toBe(1.2);
	});

	it('senior peu actif : facteur fixe 1.0', () => {
		expect(resoudreFacteurDER({ ...profilVide, ageMonths: 100, activityLevel: 'faible' })).toBe(1.0);
	});

	it('senior actif : positionne dans la plage 1.1-1.4', () => {
		expect(resoudreFacteurDER({ ...profilVide, ageMonths: 100, activityLevel: 'eleve' })).toBe(1.4);
	});

	it('adulte stérilisé, activité normale : positionne dans la plage 1.2-1.4', () => {
		expect(
			resoudreFacteurDER({ ...profilVide, sterilized: true, activityLevel: 'modere' })
		).toBe(1.3);
		expect(
			resoudreFacteurDER({ ...profilVide, sterilized: true, activityLevel: 'eleve' })
		).toBe(1.4);
	});

	it('adulte stérilisé, peu actif : milieu de la plage 1.0-1.2', () => {
		expect(
			resoudreFacteurDER({ ...profilVide, sterilized: true, activityLevel: 'faible' })
		).toBe(1.1);
	});

	it('adulte entier actif : facteur fixe 1.4', () => {
		expect(resoudreFacteurDER({ ...profilVide, sterilized: false })).toBe(1.4);
	});

	it("chat d'intérieur strict : tire le facteur vers le bas par rapport au même profil avec accès extérieur", () => {
		const interieur = resoudreFacteurDER({
			...profilVide,
			sterilized: true,
			activityLevel: 'modere',
			hasOutdoorAccess: false
		});
		const exterieur = resoudreFacteurDER({
			...profilVide,
			sterilized: true,
			activityLevel: 'modere',
			hasOutdoorAccess: true
		});
		expect(interieur).toBeLessThan(exterieur);
		expect(interieur).toBe(1.25);
		expect(exterieur).toBe(1.3);
	});

	it("accès extérieur inconnu (null) : se comporte comme un chat avec accès extérieur (pas de correctif)", () => {
		expect(
			resoudreFacteurDER({ ...profilVide, sterilized: true, activityLevel: 'modere', hasOutdoorAccess: null })
		).toBe(1.3);
	});
});

describe('estimerEMAtwater', () => {
	it('calcule EM à partir des glucides fournis directement', () => {
		const em = estimerEMAtwater({ proteinesG: 30, lipidesG: 15, glucidesG: 5 });
		expect(em).toBeCloseTo(30 * 3.5 + 15 * 8.5 + 5 * 3.5, 6);
	});

	it('calcule les glucides par différence si non fournis', () => {
		// glucides = 100 - 30 - 15 - 6 - 8 - 2 = 39
		const em = estimerEMAtwater({
			proteinesG: 30,
			lipidesG: 15,
			cendresG: 6,
			humiditeG: 8,
			fibresG: 2
		});
		expect(em).toBeCloseTo(30 * 3.5 + 15 * 8.5 + 39 * 3.5, 6);
	});

	it('ne renvoie jamais des glucides négatifs par différence', () => {
		const em = estimerEMAtwater({ proteinesG: 40, lipidesG: 40, humiditeG: 40 });
		// 100-40-40-40 = -20 -> clampé à 0
		expect(em).toBeCloseTo(40 * 3.5 + 40 * 8.5 + 0 * 3.5, 6);
	});
});

describe('convertirNutrimentPour1000kcal', () => {
	it('convertit un nutriment g/100g en g/1000kcal', () => {
		expect(convertirNutrimentPour1000kcal(10, 350)).toBeCloseTo((10 / 350) * 1000, 6);
	});
});

describe('arrondirGrammes', () => {
	it('arrondit au 0.5g le plus proche', () => {
		expect(arrondirGrammes(60.24)).toBe(60);
		expect(arrondirGrammes(60.26)).toBe(60.5);
		expect(arrondirGrammes(60.74)).toBe(60.5);
		expect(arrondirGrammes(60.76)).toBe(61);
	});
});

describe('validerRation', () => {
	it('détecte un déficit en protéines', () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 10, lipidesG: 30 },
			totalKcal: 300
		});
		const proteines = resultats.find((r) => r.nutriment === 'proteines');
		expect(proteines?.statut).toBe('DEFICIT');
	});

	it('détecte un statut OK quand les seuils sont respectés', () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 20, lipidesG: 8 },
			totalKcal: 300
		});
		// proteines: 20/300*1000 = 66.7 g/1000kcal -> OK (>50)
		// lipides: 8/300*1000 = 26.7 g/1000kcal -> OK (>22)
		expect(resultats.find((r) => r.nutriment === 'proteines')?.statut).toBe('OK');
		expect(resultats.find((r) => r.nutriment === 'lipides')?.statut).toBe('OK');
	});

	it('détecte un excès de phosphore et calcule le ratio Ca:P', () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 20, lipidesG: 8, calciumG: 2, phosphoreG: 1.5 },
			totalKcal: 300
		});
		// phosphore: 1.5/300*1000 = 5 g/1000kcal -> EXCES (>2.5)
		expect(resultats.find((r) => r.nutriment === 'phosphore')?.statut).toBe('EXCES');
		// calcium: 2/300*1000 = 6.67 g/1000kcal -> EXCES (>6)
		expect(resultats.find((r) => r.nutriment === 'calcium')?.statut).toBe('EXCES');
		// ratio Ca:P = 6.67/5 = 1.33 -> dans [1.0, 2.0] -> OK
		const ratio = resultats.find((r) => r.nutriment === 'ratioCalciumPhosphore');
		expect(ratio?.statut).toBe('OK');
	});

	it("signale un ratio Ca:P hors bornes", () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 60, lipidesG: 25, calciumG: 0.3, phosphoreG: 1.3 },
			totalKcal: 1000
		});
		// calcium: 0.3 g/1000kcal, phosphore: 1.3 g/1000kcal -> ratio = 0.23 < 1.0
		const ratio = resultats.find((r) => r.nutriment === 'ratioCalciumPhosphore');
		expect(ratio?.statut).toBe('DEFICIT');
	});

	it("traite les glucides comme un indicateur qualité (pas de DEFICIT/EXCES) sans donnée de matière sèche", () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 60, lipidesG: 25, glucidesG: 20 },
			totalKcal: 1000
		});
		expect(resultats.find((r) => r.nutriment === 'glucides')?.statut).toBe('OK');
	});

	it('signale ATTENTION (pas EXCES) au-delà de 25% de matière sèche en glucides', () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 60, lipidesG: 25, glucidesG: 30 },
			totalKcal: 1000,
			totalMatiereSecheG: 100 // 30/100 = 30% MS > 25%
		});
		const glucides = resultats.find((r) => r.nutriment === 'glucides');
		expect(glucides?.statut).toBe('ATTENTION');
		expect(glucides?.valeur).toBeCloseTo(30, 6);
	});

	it('glucides sous 25% de matière sèche : OK', () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 60, lipidesG: 25, glucidesG: 20 },
			totalKcal: 1000,
			totalMatiereSecheG: 100 // 20/100 = 20% MS
		});
		expect(resultats.find((r) => r.nutriment === 'glucides')?.statut).toBe('OK');
	});

	it('ignore calcium/phosphore/glucides absents', () => {
		const resultats = validerRation({
			totalNutriments: { proteinesG: 60, lipidesG: 25 },
			totalKcal: 1000
		});
		expect(resultats.find((r) => r.nutriment === 'calcium')).toBeUndefined();
		expect(resultats.find((r) => r.nutriment === 'phosphore')).toBeUndefined();
		expect(resultats.find((r) => r.nutriment === 'ratioCalciumPhosphore')).toBeUndefined();
		expect(resultats.find((r) => r.nutriment === 'glucides')).toBeUndefined();
	});
});
