import { describe, expect, it } from 'vitest';
import {
	arrondirAuDemiPaquet,
	calculerNombrePaquetsPatee,
	calculerPoidsGapCroquette,
	calculerRepartitionJournaliere,
	repartirPaquetEnParts,
	type SlotEtat
} from './repartition.calc';

describe('repartirPaquetEnParts', () => {
	it('divise un total en parts égales quand c\'est exact', () => {
		expect(repartirPaquetEnParts(80, 2)).toEqual([40, 40]);
	});

	it('corrige la dernière part quand la division ne tombe pas rond, en gardant la somme exacte', () => {
		const parts = repartirPaquetEnParts(85, 3);
		expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(85, 5);
		expect(parts).toHaveLength(3);
	});

	it("renvoie un tableau vide si nombreParts n'est pas positif", () => {
		expect(repartirPaquetEnParts(80, 0)).toEqual([]);
	});
});

describe('calculerNombrePaquetsPatee', () => {
	it('renvoie un nombre entier de paquets, jamais un demi ou un tiers', () => {
		expect(calculerNombrePaquetsPatee(220, 100)).toBe(2);
		expect(Number.isInteger(calculerNombrePaquetsPatee(167, 100))).toBe(true);
	});

	it('arrondit moitié vers le bas (favorise le paquet en moins, la pâtée coûte cher)', () => {
		expect(calculerNombrePaquetsPatee(250, 100)).toBe(2); // pile à mi-chemin entre 2 et 3 -> reste à 2
		expect(calculerNombrePaquetsPatee(251, 100)).toBe(3);
	});

	it("jamais moins d'un paquet entier tant que la pâtée est active", () => {
		expect(calculerNombrePaquetsPatee(10, 100)).toBe(1);
	});
});

describe('arrondirAuDemiPaquet', () => {
	it('aligne sur le demi-paquet le plus proche, jamais un quart ou un tiers', () => {
		expect(arrondirAuDemiPaquet(74, 100)).toBe(50);
		expect(arrondirAuDemiPaquet(76, 100)).toBe(100);
		expect(arrondirAuDemiPaquet(0, 100)).toBe(0);
	});
});

describe('calculerPoidsGapCroquette', () => {
	it('un créneau suivi de près par le prochain repas pèse moins qu\'un créneau qui précède un long trou', () => {
		const slots: SlotEtat[] = [
			{ id: 'matin', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 8 * 60 },
			{ id: 'midi', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 9 * 60 }, // 1h après le matin
			{ id: 'soir', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 20 * 60 } // 11h après midi
		];

		const poids = calculerPoidsGapCroquette(slots);

		expect(poids.get('matin')).toBeLessThan(poids.get('midi')!);
		expect(poids.get('midi')).toBeGreaterThan(poids.get('soir')!);
	});

	it('une attente nocturne pèse moins qu\'une attente diurne de même durée', () => {
		const slotsJour: SlotEtat[] = [
			{ id: 'a', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 8 * 60 },
			{ id: 'b', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 15 * 60 } // 7h plus tard, en journée
		];
		const slotsNuit: SlotEtat[] = [
			{ id: 'a', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 21 * 60 },
			{ id: 'b', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 4 * 60 } // 7h plus tard, en pleine nuit
		];

		const poidsJour = calculerPoidsGapCroquette(slotsJour).get('a')!;
		const poidsNuit = calculerPoidsGapCroquette(slotsNuit).get('a')!;

		expect(poidsNuit).toBeLessThan(poidsJour);
	});

	it('un créneau verrouillé ne reçoit pas de poids (sa quantité ne sera pas touchée de toute façon)', () => {
		const slots: SlotEtat[] = [
			{ id: 'a', foodType: 'croquette', locked: true, quantiteActuelleG: 20, heureMinutes: 8 * 60 },
			{ id: 'b', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 20 * 60 }
		];

		const poids = calculerPoidsGapCroquette(slots);

		expect(poids.has('a')).toBe(false);
		expect(poids.has('b')).toBe(true);
	});

	it('renvoie une map vide si aucun créneau n\'a d\'heure connue', () => {
		const slots: SlotEtat[] = [{ id: 'a', foodType: 'croquette', locked: false, quantiteActuelleG: 0 }];
		expect(calculerPoidsGapCroquette(slots).size).toBe(0);
	});
});

describe('calculerRepartitionJournaliere', () => {
	it('croquette seule : répartie également entre tous les créneaux croquette', () => {
		const slots: SlotEtat[] = [
			{ id: 'a', foodType: 'croquette', locked: false, quantiteActuelleG: 0 },
			{ id: 'b', foodType: 'croquette', locked: false, quantiteActuelleG: 0 }
		];

		const resultat = calculerRepartitionJournaliere({
			der: 300,
			croquette: { kcal100g: 375 },
			patee: null,
			friandise: null,
			slots
		});

		expect(resultat.slots.find((s) => s.id === 'a')?.quantiteG).toBeCloseTo(40, 1);
		expect(resultat.slots.find((s) => s.id === 'b')?.quantiteG).toBeCloseTo(40, 1);
		expect(resultat.avertissements).toHaveLength(0);
	});

	it('croquette avec heures connues : le créneau qui précède le plus long trou reçoit la plus grosse part', () => {
		const slots: SlotEtat[] = [
			{ id: 'matin', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 8 * 60 }, // 1h avant "midi"
			{ id: 'midi', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 9 * 60 }, // 11h avant "soir"
			{ id: 'soir', foodType: 'croquette', locked: false, quantiteActuelleG: 0, heureMinutes: 20 * 60 } // 12h avant "matin" du lendemain
		];

		const resultat = calculerRepartitionJournaliere({
			der: 300,
			croquette: { kcal100g: 375 },
			patee: null,
			friandise: null,
			slots
		});

		const total = resultat.slots.reduce((s, sl) => s + sl.quantiteG, 0);
		const midi = resultat.slots.find((s) => s.id === 'midi')!.quantiteG;
		const matin = resultat.slots.find((s) => s.id === 'matin')!.quantiteG;

		expect(midi).toBeGreaterThan(matin);
		expect(total).toBeCloseTo(80, 0); // 300 kcal / 3.75 kcal/g
	});

	it('pâtée + croquette : le budget est partagé (50/50 par défaut), pas maximisé sur la pâtée', () => {
		const slots: SlotEtat[] = [
			{ id: 'p1', foodType: 'patee', locked: false, quantiteActuelleG: 0 },
			{ id: 'c1', foodType: 'croquette', locked: false, quantiteActuelleG: 0 }
		];

		const resultat = calculerRepartitionJournaliere({
			der: 300,
			croquette: { kcal100g: 375 },
			patee: { kcal100g: 90, packageSizeG: 100 },
			friandise: null,
			slots
		});

		// Budget pâtée = 300 * 0.5 = 150 kcal ; kcal/paquet = 90 -> 150/90 = 1.67 -> arrondi à l'entier = 2 paquets
		expect(resultat.nombrePaquetsPatee).toBe(2);
		expect(resultat.slots.find((s) => s.id === 'p1')?.quantiteG).toBe(200);
		// Croquette absorbe le vrai reste : 300 - 180 (180 = 200g pâtée * 90/100) = 120 kcal -> 32g
		expect(resultat.slots.find((s) => s.id === 'c1')?.quantiteG).toBeCloseTo(32, 0);
		expect(resultat.avertissements).toHaveLength(0);
	});

	it('pâtée seule dépassant le besoin : avertissement, pas de valeur négative', () => {
		const slots: SlotEtat[] = [{ id: 'p1', foodType: 'patee', locked: false, quantiteActuelleG: 0 }];

		const resultat = calculerRepartitionJournaliere({
			der: 100,
			croquette: null,
			patee: { kcal100g: 90, packageSizeG: 100 },
			friandise: null,
			slots
		});

		expect(resultat.slots[0].quantiteG).toBeGreaterThanOrEqual(0);
		expect(resultat.avertissements.length).toBeGreaterThan(0);
	});

	it('ajustement manuel (slider) : le créneau verrouillé garde sa valeur, le reste se répartit sur les non-verrouillés', () => {
		const slots: SlotEtat[] = [
			{ id: 'a', foodType: 'croquette', locked: true, quantiteActuelleG: 5 },
			{ id: 'b', foodType: 'croquette', locked: false, quantiteActuelleG: 0 },
			{ id: 'c', foodType: 'croquette', locked: false, quantiteActuelleG: 0 }
		];

		const resultat = calculerRepartitionJournaliere({
			der: 300,
			croquette: { kcal100g: 375 },
			patee: null,
			friandise: null,
			slots
		});

		const totalCroquetteG = arrondirTest((300 / 375) * 100);
		expect(resultat.slots.find((s) => s.id === 'a')?.quantiteG).toBe(5);
		const reste = totalCroquetteG - 5;
		expect(resultat.slots.find((s) => s.id === 'b')?.quantiteG).toBeCloseTo(reste / 2, 0);
		expect(resultat.slots.find((s) => s.id === 'c')?.quantiteG).toBeCloseTo(reste / 2, 0);
	});

	it('ajustement qui dépasse le besoin restant : les autres créneaux passent à 0, jamais négatif, avertissement', () => {
		const slots: SlotEtat[] = [
			{ id: 'a', foodType: 'croquette', locked: true, quantiteActuelleG: 1000 },
			{ id: 'b', foodType: 'croquette', locked: false, quantiteActuelleG: 0 }
		];

		const resultat = calculerRepartitionJournaliere({
			der: 300,
			croquette: { kcal100g: 375 },
			patee: null,
			friandise: null,
			slots
		});

		expect(resultat.slots.find((s) => s.id === 'b')?.quantiteG).toBe(0);
		expect(resultat.avertissements.some((a) => a.includes('dépassent déjà'))).toBe(true);
	});

	it('tous les créneaux restants verrouillés/donnés sans couvrir le besoin : avertissement explicite', () => {
		const slots: SlotEtat[] = [{ id: 'a', foodType: 'croquette', locked: true, quantiteActuelleG: 1 }];

		const resultat = calculerRepartitionJournaliere({
			der: 300,
			croquette: { kcal100g: 375 },
			patee: null,
			friandise: null,
			slots
		});

		expect(resultat.avertissements.some((a) => a.includes('manque'))).toBe(true);
	});
});

function arrondirTest(g: number): number {
	return Math.round(g * 2) / 2;
}
