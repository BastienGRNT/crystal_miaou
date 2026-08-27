import { json, error, type RequestHandler } from '@sveltejs/kit';
import { scanFoodLabelImage } from '$lib/server/services/labelScan.service';

const TAILLE_MAX_OCTETS = 8 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const formData = await request.formData();
	const image = formData.get('image');

	if (!(image instanceof File) || image.size === 0) {
		error(400, 'Aucune image fournie.');
	}

	if (!image.type.startsWith('image/')) {
		error(400, 'Le fichier fourni n’est pas une image.');
	}

	if (image.size > TAILLE_MAX_OCTETS) {
		error(400, 'Image trop volumineuse (8 Mo maximum).');
	}

	const buffer = Buffer.from(await image.arrayBuffer());

	try {
		const result = await scanFoodLabelImage(buffer);
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Échec de la lecture de l'image.";
		error(500, message);
	}
};
