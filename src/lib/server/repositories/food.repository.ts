import { db } from '$lib/server/db';
import { food } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { FoodLegalStatus, FoodType } from '$lib/domain/food.calc';

export interface FoodRecordInput {
	name: string;
	brand: string;
	type: FoodType;
	emKcal100g: number;
	emEstimee: boolean;
	packageSizeG: number | null;
	proteinesG100g: number;
	lipidesG100g: number;
	humiditeG100g: number;
	humiditeEstimee: boolean;
	fibresG100g: number;
	cendresG100g: number;
	glucidesG100g: number;
	glucidesEstimes: boolean;
	calciumG100g: number | null;
	phosphoreG100g: number | null;
	taurineG100g: number | null;
	statutLegal: FoodLegalStatus;
}

function toNumeric(value: number): string {
	return value.toString();
}

export async function listFoodsForUser(ownerUserId: string, type?: FoodType) {
	return db.query.food.findMany({
		where: type
			? and(eq(food.createdByUserId, ownerUserId), eq(food.type, type))
			: eq(food.createdByUserId, ownerUserId),
		orderBy: (foodTable, { desc }) => [desc(foodTable.createdAt)]
	});
}

export async function findFoodByIdForUser(id: string, ownerUserId: string) {
	return db.query.food.findFirst({
		where: and(eq(food.id, id), eq(food.createdByUserId, ownerUserId))
	});
}

export async function createFood(input: FoodRecordInput, ownerUserId: string) {
	const [created] = await db
		.insert(food)
		.values({
			id: crypto.randomUUID(),
			name: input.name,
			brand: input.brand,
			type: input.type,
			emKcal100g: toNumeric(input.emKcal100g),
			emEstimee: input.emEstimee,
			packageSizeG: input.packageSizeG === null ? null : toNumeric(input.packageSizeG),
			proteinesG100g: toNumeric(input.proteinesG100g),
			lipidesG100g: toNumeric(input.lipidesG100g),
			humiditeG100g: toNumeric(input.humiditeG100g),
			humiditeEstimee: input.humiditeEstimee,
			fibresG100g: toNumeric(input.fibresG100g),
			cendresG100g: toNumeric(input.cendresG100g),
			glucidesG100g: toNumeric(input.glucidesG100g),
			glucidesEstimes: input.glucidesEstimes,
			calciumG100g: input.calciumG100g === null ? null : toNumeric(input.calciumG100g),
			phosphoreG100g: input.phosphoreG100g === null ? null : toNumeric(input.phosphoreG100g),
			taurineG100g: input.taurineG100g === null ? null : toNumeric(input.taurineG100g),
			statutLegal: input.statutLegal,
			createdByUserId: ownerUserId
		})
		.returning();

	return created;
}

export async function updateFood(id: string, ownerUserId: string, input: FoodRecordInput) {
	const [updated] = await db
		.update(food)
		.set({
			name: input.name,
			brand: input.brand,
			type: input.type,
			emKcal100g: toNumeric(input.emKcal100g),
			emEstimee: input.emEstimee,
			packageSizeG: input.packageSizeG === null ? null : toNumeric(input.packageSizeG),
			proteinesG100g: toNumeric(input.proteinesG100g),
			lipidesG100g: toNumeric(input.lipidesG100g),
			humiditeG100g: toNumeric(input.humiditeG100g),
			humiditeEstimee: input.humiditeEstimee,
			fibresG100g: toNumeric(input.fibresG100g),
			cendresG100g: toNumeric(input.cendresG100g),
			glucidesG100g: toNumeric(input.glucidesG100g),
			glucidesEstimes: input.glucidesEstimes,
			calciumG100g: input.calciumG100g === null ? null : toNumeric(input.calciumG100g),
			phosphoreG100g: input.phosphoreG100g === null ? null : toNumeric(input.phosphoreG100g),
			taurineG100g: input.taurineG100g === null ? null : toNumeric(input.taurineG100g),
			statutLegal: input.statutLegal
		})
		.where(and(eq(food.id, id), eq(food.createdByUserId, ownerUserId)))
		.returning();

	return updated;
}

export async function deleteFood(id: string, ownerUserId: string): Promise<boolean> {
	const deleted = await db
		.delete(food)
		.where(and(eq(food.id, id), eq(food.createdByUserId, ownerUserId)))
		.returning({ id: food.id });

	return deleted.length > 0;
}
