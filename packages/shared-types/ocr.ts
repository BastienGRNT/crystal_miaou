// Miroir de app/src/lib/domain/ocr.calc.ts — forme exacte de POST /api/v1/foods/scan. Résultat toujours
// une pré-saisie : une étape de correction manuelle est obligatoire avant sauvegarde (CLAUDE.md règle 8).

import type { FoodLegalStatus, FoodType } from './food';

export interface ParsedField<T> {
	value: T | null;
	/** Extrait de texte source ayant permis l'extraction — aide à la relecture manuelle. */
	raw: string | null;
}

export interface ParsedFoodLabel {
	name: ParsedField<string>;
	brand: ParsedField<string>;
	type: ParsedField<FoodType>;
	statutLegal: ParsedField<FoodLegalStatus>;
	emKcal100g: ParsedField<number>;
	proteinesG100g: ParsedField<number>;
	lipidesG100g: ParsedField<number>;
	humiditeG100g: ParsedField<number>;
	fibresG100g: ParsedField<number>;
	cendresG100g: ParsedField<number>;
	glucidesG100g: ParsedField<number>;
	warnings: string[];
}

export interface LabelScanResponse {
	rawText: string;
	parsed: ParsedFoodLabel;
}
