import { describe, expect, it } from 'vitest';
import { parseFoodLabelText } from './ocr.calc';

describe('parseFoodLabelText', () => {
	it('extrait les valeurs depuis un tableau croquette en kcal/kg, avec bruit OCR (accents manquants)', () => {
		const texte = `ROYAL CANIN STERILISED
Composition analytique
Proteines brutes 34,0 %
Matieres grasses brutes 13,0 %
Cellulose brute 3,5 %
Cendres brutes 6,5 %
Humidite 7,0 %
Energie metabolisable 3850 kcal/kg`;

		const result = parseFoodLabelText(texte);

		expect(result.proteinesG100g.value).toBe(34);
		expect(result.lipidesG100g.value).toBe(13);
		expect(result.fibresG100g.value).toBe(3.5);
		expect(result.cendresG100g.value).toBe(6.5);
		expect(result.humiditeG100g.value).toBe(7);
		expect(result.emKcal100g.value).toBe(385);
		expect(result.warnings).toContain('Énergie convertie de kcal/kg vers kcal/100g.');
		expect(result.warnings).not.toContain('Aucun tableau nutritionnel détecté — vérifiez toutes les valeurs.');
	});

	it('extrait les valeurs depuis un tableau pâtée en %, avec accents corrects', () => {
		const texte = `Analyse moyenne
Protéines : 10,5%
Lipides : 4,5%
Humidité : 80,0%
Cendres : 2,0%`;

		const result = parseFoodLabelText(texte);

		expect(result.proteinesG100g.value).toBe(10.5);
		expect(result.lipidesG100g.value).toBe(4.5);
		expect(result.humiditeG100g.value).toBe(80);
		expect(result.cendresG100g.value).toBe(2);
	});

	it("signale l'absence de tableau nutritionnel sur un texte libre et reste best-effort", () => {
		const texte = `Terrine pour chat au poulet
Sans céréales, riche en protéines animales.
Un régal pour votre compagnon.`;

		const result = parseFoodLabelText(texte);

		expect(result.warnings).toContain('Aucun tableau nutritionnel détecté — vérifiez toutes les valeurs.');
		expect(result.proteinesG100g.value).toBeNull();
		expect(result.name.value).toBe('Terrine pour chat au poulet');
	});
});
