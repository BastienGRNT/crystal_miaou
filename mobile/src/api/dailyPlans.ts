import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DailyPlan, DailyPlanInput } from '@shared/dailyPlan';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export function useDailyPlans(catId: string | undefined) {
	return useQuery({
		queryKey: ['dailyPlans', catId],
		queryFn: () => apiGet<{ dailyPlans: DailyPlan[] }>('/api/daily-plans', { catId }).then((res) => res.dailyPlans),
		enabled: catId !== undefined
	});
}

export function useCreateDailyPlan(catId: string | undefined) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: DailyPlanInput) => apiPost<{ dailyPlan: DailyPlan }>('/api/daily-plans', input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dailyPlans', catId] });
		}
	});
}

export function useUpdateDailyPlan(catId: string | undefined) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, input }: { id: string; input: DailyPlanInput }) => apiPatch<{ dailyPlan: DailyPlan }>(`/api/daily-plans/${id}`, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dailyPlans', catId] });
		}
	});
}

export function useDeleteDailyPlan(catId: string | undefined) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiDelete(`/api/daily-plans/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dailyPlans', catId] });
		}
	});
}

export function useActivateDailyPlan(catId: string | undefined) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dailyPlanId: string) => apiPost(`/api/daily-plans/${dailyPlanId}/activate`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dailyPlans', catId] });
			queryClient.invalidateQueries({ queryKey: ['repartition'] });
		}
	});
}
