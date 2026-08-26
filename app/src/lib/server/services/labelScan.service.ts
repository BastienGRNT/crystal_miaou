import { createWorker } from 'tesseract.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parseFoodLabelText, type ParsedFoodLabel } from '$lib/domain/ocr.calc';

const TESSDATA_PATH = path.join(process.cwd(), 'static', 'tessdata');

export interface LabelScanResult {
	rawText: string;
	parsed: ParsedFoodLabel;
}

function assertTessdataAvailable(): void {
	const pretExecuter =
		existsSync(path.join(TESSDATA_PATH, 'fra.traineddata')) &&
		existsSync(path.join(TESSDATA_PATH, 'eng.traineddata'));

	if (!pretExecuter) {
		throw new Error(
			"Données OCR manquantes : lancez `npm run setup:ocr` avant d'utiliser le scan d'étiquette."
		);
	}
}

/** Lance l'OCR local (Tesseract.js, français + anglais) sur une image d'étiquette, puis parse le texte obtenu. */
export async function scanFoodLabelImage(imageBuffer: Buffer): Promise<LabelScanResult> {
	assertTessdataAvailable();

	// Un worker par requête (plutôt qu'un singleton partagé) : évite les problèmes de concurrence
	// entre requêtes simultanées, acceptable pour le volume d'usage d'une app self-hosted.
	const worker = await createWorker('fra+eng', 1, {
		langPath: TESSDATA_PATH,
		cachePath: TESSDATA_PATH,
		gzip: false
	});

	try {
		const {
			data: { text }
		} = await worker.recognize(imageBuffer);

		return { rawText: text, parsed: parseFoodLabelText(text) };
	} finally {
		await worker.terminate();
	}
}
