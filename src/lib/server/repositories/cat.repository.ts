import { db } from '$lib/server/db';
import { cat, catMember } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type {
	CatActivityLevel,
	CatSex,
	CatSpecialCondition
} from '$lib/domain/cat.calc';

export interface CreateCatWithOwnerInput {
	name: string;
	weightKg: number;
	birthDate: string | null;
	sex: CatSex;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
	ownerUserId: string;
}

export async function createCatWithOwner(input: CreateCatWithOwnerInput) {
	return db.transaction(async (tx) => {
		const [createdCat] = await tx
			.insert(cat)
			.values({
				id: crypto.randomUUID(),
				name: input.name,
				weightKg: input.weightKg.toString(),
				birthDate: input.birthDate,
				sex: input.sex,
				sterilized: input.sterilized,
				activityLevel: input.activityLevel,
				hasOutdoorAccess: input.hasOutdoorAccess,
				specialCondition: input.specialCondition,
				createdByUserId: input.ownerUserId
			})
			.returning();

		await tx.insert(catMember).values({
			id: crypto.randomUUID(),
			catId: createdCat.id,
			userId: input.ownerUserId
		});

		return createdCat;
	});
}

export async function deleteCatsCreatedByUser(ownerUserId: string): Promise<void> {
	await db.delete(cat).where(eq(cat.createdByUserId, ownerUserId));
}

export async function listCatsForUser(userId: string) {
	const memberships = await db.query.catMember.findMany({
		where: eq(catMember.userId, userId),
		with: { cat: true }
	});

	return memberships.map((membership) => membership.cat);
}

export async function findCatById(catId: string) {
	return db.query.cat.findFirst({ where: eq(cat.id, catId) });
}

/** Le chat avec ses aliments actifs (pâtée/croquette/friandise) résolus — évite au service de
 * recharger le catalogue produit après avoir lu la sélection persistante du chat. */
export async function findCatWithActiveFoodsById(catId: string) {
	return db.query.cat.findFirst({
		where: eq(cat.id, catId),
		with: {
			activeCroquetteFood: true,
			activePateeFood: true,
			activeFriandiseFood: true
		}
	});
}

export async function isCatMemberForUser(catId: string, userId: string): Promise<boolean> {
	const membership = await db.query.catMember.findFirst({
		where: and(eq(catMember.catId, catId), eq(catMember.userId, userId))
	});

	return membership !== undefined;
}

export interface UpdateCatProfileInput {
	name: string;
	weightKg: number;
	birthDate: string;
	sex: CatSex;
	sterilized: boolean;
	activityLevel: CatActivityLevel;
	hasOutdoorAccess: boolean;
	specialCondition: CatSpecialCondition;
}

export async function updateCatProfile(catId: string, input: UpdateCatProfileInput) {
	const [updated] = await db
		.update(cat)
		.set({
			name: input.name,
			weightKg: input.weightKg.toString(),
			birthDate: input.birthDate,
			sex: input.sex,
			sterilized: input.sterilized,
			activityLevel: input.activityLevel,
			hasOutdoorAccess: input.hasOutdoorAccess,
			specialCondition: input.specialCondition
		})
		.where(eq(cat.id, catId))
		.returning();
	return updated;
}

export interface UpdateCatFoodSelectionInput {
	activeCroquetteFoodId?: string | null;
	activePateeFoodId?: string | null;
	activeFriandiseFoodId?: string | null;
	friandiseQuantiteTotaleG?: number | null;
	pateeNombrePaquetsOverride?: number | null;
}

export async function updateCatFoodSelection(catId: string, input: UpdateCatFoodSelectionInput) {
	const values: Record<string, string | null> = {};
	if ('activeCroquetteFoodId' in input) values.activeCroquetteFoodId = input.activeCroquetteFoodId ?? null;
	if ('activePateeFoodId' in input) values.activePateeFoodId = input.activePateeFoodId ?? null;
	if ('activeFriandiseFoodId' in input) values.activeFriandiseFoodId = input.activeFriandiseFoodId ?? null;
	if ('friandiseQuantiteTotaleG' in input) {
		values.friandiseQuantiteTotaleG =
			input.friandiseQuantiteTotaleG === null || input.friandiseQuantiteTotaleG === undefined
				? null
				: input.friandiseQuantiteTotaleG.toString();
	}
	if ('pateeNombrePaquetsOverride' in input) {
		values.pateeNombrePaquetsOverride =
			input.pateeNombrePaquetsOverride === null || input.pateeNombrePaquetsOverride === undefined
				? null
				: input.pateeNombrePaquetsOverride.toString();
	}

	const [updated] = await db.update(cat).set(values).where(eq(cat.id, catId)).returning();
	return updated;
}
