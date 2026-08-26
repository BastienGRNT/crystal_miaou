import { json, error, type RequestHandler } from '@sveltejs/kit';
import { removeCatMemberForUser } from '$lib/server/services/cat.service';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const result = await removeCatMemberForUser(params.id, params.memberId, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ success: true });
};
