import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RepartitionErrorResponse, RepartitionOkResponse } from '@shared/repartition';
import type { DailyLogErrorResponse, DailyLogOkResponse } from '@shared/dailyLog';
import { ApiError, apiGet, apiPatch, apiPost } from './client';

/** Jour courant : `GET /api/v1/repartition` recalcule et persiste les quantités non verrouillées à
 * chaque appel (voir specs — c'est ce qui rend les ajustements visibles par tout le foyer). */
export function useRepartition(catId: string | undefined, date: string) {
	return useQuery({
		queryKey: ['repartition', catId, date],
		queryFn: async () => {
			const result = await apiGet<RepartitionOkResponse | RepartitionErrorResponse>('/api/v1/repartition', { catId, date });
			if (!result.success) throw new ApiError(400, result.error);
			return result;
		},
		enabled: catId !== undefined
	});
}

/** Jour passé : lecture seule, ne génère ni ne persiste rien. */
export function useDailyLog(catId: string | undefined, date: string) {
	return useQuery({
		queryKey: ['dailyLog', catId, date],
		queryFn: async () => {
			const result = await apiGet<DailyLogOkResponse | DailyLogErrorResponse>('/api/v1/daily-log', { catId, date });
			if (!result.success) throw new ApiError(400, result.error);
			return result;
		},
		enabled: catId !== undefined
	});
}

export function useResetRepartition(catId: string, date: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => apiPost<RepartitionOkResponse | RepartitionErrorResponse>('/api/v1/repartition', { catId, date }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['repartition', catId, date] });
		}
	});
}

interface UpdateMealEntryInput {
	quantityG?: number;
	validated?: boolean;
}

export function usePatchMealEntry(catId: string, date: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: UpdateMealEntryInput }) =>
			apiPatch(`/api/v1/meal-entries/${id}`, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['repartition', catId, date] });
		}
	});
}
