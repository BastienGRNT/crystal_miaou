import { db } from '$lib/server/db';
import { catWeightLog } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export async function listWeightLogsForCat(catId: string) {
	return db.query.catWeightLog.findMany({
		where: eq(catWeightLog.catId, catId),
		orderBy: (log, { asc }) => [asc(log.recordedAt)]
	});
}

export interface CreateWeightLogInput {
	catId: string;
	weightKg: number;
	recordedAt: string;
	recordedByUserId: string;
}

export async function createWeightLog(input: CreateWeightLogInput) {
	const [created] = await db
		.insert(catWeightLog)
		.values({
			id: crypto.randomUUID(),
			catId: input.catId,
			weightKg: input.weightKg.toString(),
			recordedAt: input.recordedAt,
			recordedByUserId: input.recordedByUserId
		})
		.returning();

	return created;
}

export async function deleteWeightLog(id: string, catId: string): Promise<boolean> {
	const deleted = await db
		.delete(catWeightLog)
		.where(and(eq(catWeightLog.id, id), eq(catWeightLog.catId, catId)))
		.returning({ id: catWeightLog.id });

	return deleted.length > 0;
}
