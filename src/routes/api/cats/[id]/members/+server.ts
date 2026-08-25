import { json, error, type RequestHandler } from '@sveltejs/kit';
import { addCatMemberForUser, listMembersForCatForUser } from '$lib/server/services/cat.service';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const result = await listMembersForCatForUser(params.id, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 404 });
	}

	return json({ members: result.members });
};

export const POST: RequestHandler = async ({ request, locals, params }) => {
	if (!locals.user) {
		error(401, 'Non authentifié.');
	}

	const body = await request.json();
	const email = typeof body.email === 'string' ? body.email : '';

	const result = await addCatMemberForUser(params.id, email, locals.user.id);

	if (!result.success) {
		return json({ error: result.error }, { status: 400 });
	}

	return json({ member: result.member }, { status: 201 });
};
