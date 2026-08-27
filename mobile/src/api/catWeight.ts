import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WeightHistoryOkResponse } from '@shared/catWeight';
import { apiDelete, apiGet, apiPost } from './client';

export function useWeightHistory(catId: string) {
	return useQuery({
		queryKey: ['weightHistory', catId],
		queryFn: () => apiGet<WeightHistoryOkResponse>(`/api/v1/cats/${catId}/weight-logs`)
	});
}

export function useAddWeightLog(catId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: { weightKg: number; recordedAt: string }) => apiPost(`/api/v1/cats/${catId}/weight-logs`, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['weightHistory', catId] });
		}
	});
}

export function useDeleteWeightLog(catId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiDelete(`/api/v1/cats/${catId}/weight-logs`, { id }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['weightHistory', catId] });
		}
	});
}
