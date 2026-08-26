#!/usr/bin/env node
// Télécharge une seule fois les données de langue Tesseract (fra + eng) nécessaires au scan
// d'étiquette (src/lib/server/services/labelScan.service.ts). Runtime app = zéro appel réseau ;
// seul ce script, lancé manuellement (`npm run setup:ocr`), a besoin d'internet.

import { existsSync, mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const TESSDATA_DIR = path.join(process.cwd(), 'static', 'tessdata');
const BASE_URL = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main';
const LANGUES = ['fra', 'eng'];

async function telechargerLangue(langue) {
	const fichier = `${langue}.traineddata`;
	const destination = path.join(TESSDATA_DIR, fichier);

	if (existsSync(destination)) {
		console.log(`✓ ${fichier} déjà présent, ignoré.`);
		return;
	}

	const url = `${BASE_URL}/${fichier}`;
	console.log(`↓ Téléchargement de ${fichier}...`);

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Échec du téléchargement de ${url} (HTTP ${response.status})`);
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	await writeFile(destination, buffer);
	console.log(`✓ ${fichier} téléchargé (${(buffer.byteLength / 1024 / 1024).toFixed(1)} Mo).`);
}

async function main() {
	mkdirSync(TESSDATA_DIR, { recursive: true });
	for (const langue of LANGUES) {
		await telechargerLangue(langue);
	}
	console.log('OCR prêt : le scan d’étiquette peut être utilisé sans connexion réseau.');
}

main().catch((err) => {
	console.error(err.message);
	process.exit(1);
});
