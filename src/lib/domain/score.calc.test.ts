import { describe, expect, it } from 'vitest';
import { calculerScoreRation, type ScoreRationInput } from './score.calc';
import type { StatusParNutriment } from './nutrition.calc';

function statutOK(nutriment: StatusParNutriment['nutriment'], valeur: number): StatusParNutriment {
	return { nutriment, valeur, statut: 'OK', seuil: { min: 0, max: null }, positionPct: 100 };
}

function inputParfait(overrides: Partial<ScoreRationInput> = {}): ScoreRationInput {
	return {
		totalKcal: 240,
		der: 240,
		rer: 190,
		statuts: [
			statutOK('proteines', 130),
			statutOK('lipides', 40),
			statutOK('calcium', 3),
			statutOK('phosphore', 2),
			statutOK('taurine', 2),
			statutOK('glucides', 8)
		],
		fiabiliteParAliment: [],
		glucidesParAliment: [],
		nombreAlimentsActifs: 2,
		...overrides
	};
}

describe('calculerScoreRation', () => {
	it('donne 100 et un feu vert quand tout est dans la cible et rien n\'est estimé', () => {
		const resultat = calculerScoreRation(inputParfait());

		expect(resultat.score).toBe(100);
		expect(resultat.niveau).toBe('excellent');
		expect(resultat.actions).toHaveLength(0);
	});

	it('plafonne l\'axe énergie et bascule en "À corriger" quand la ration passe sous le RER', () => {
		const resultat = calculerScoreRation(inputParfait({ totalKcal: 150 }));

		const axeEnergie = resultat.axes.find((a) => a.id === 'energie');
		expect(axeEnergie?.points).toBeLessThanOrEqual(4);
		expect(axeEnergie?.statut).toBe('probleme');
		expect(resultat.titre).toBe('À corriger');
		expect(resultat.actions[0].id).toBe('sous-rer');
	});

	it('pénalise plus fortement un déficit massif qu\'un déficit limite', () => {
		const seuil = { min: 50, max: null };
		const limite = calculerScoreRation(
			inputParfait({
				statuts: [{ nutriment: 'proteines', valeur: 45, statut: 'DEFICIT', seuil, positionPct: 90 }]
			})
		);
		const massif = calculerScoreRation(
			inputParfait({
				statuts: [{ nutriment: 'proteines', valeur: 20, statut: 'DEFICIT', seuil, positionPct: 40 }]
			})
		);

		expect(massif.score).toBeLessThan(limite.score);
		expect(massif.actions.some((a) => a.id === 'deficit-proteines')).toBe(true);
	});

	it('classe les actions par impact décroissant', () => {
		const resultat = calculerScoreRation(
			inputParfait({
				totalKcal: 300,
				statuts: [
					{ nutriment: 'glucides', valeur: 28, statut: 'ATTENTION', seuil: { min: null, max: 12 }, positionPct: 100 }
				],
				glucidesParAliment: [{ foodId: 'f1', foodName: 'Croquettes X', pctMatiereSeche: 30 }],
				fiabiliteParAliment: [
					{ foodId: 'f1', foodName: 'Croquettes X', emEstimee: true, humiditeEstimee: false, glucidesEstimes: false }
				]
			})
		);

		const impacts = resultat.actions.map((a) => a.impact);
		expect(impacts[0]).toBe('fort');
		expect(impacts.at(-1)).toBe('faible');
		expect(resultat.actions.find((a) => a.id === 'glucides')?.titre).toContain('Croquettes X');
	});

	it('retire des points de fiabilité quand des nutriments ne sont pas renseignés', () => {
		const resultat = calculerScoreRation(
			inputParfait({ statuts: [statutOK('proteines', 130), statutOK('lipides', 40)] })
		);

		const axeFiabilite = resultat.axes.find((a) => a.id === 'fiabilite');
		expect(axeFiabilite?.points).toBe(14);
		expect(resultat.actions.some((a) => a.id === 'nutriments-absents')).toBe(true);
	});
});
