import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MealEntry, MealEntryInput } from '@shared/mealEntry';
import { apiDelete, apiGet, apiPost } from './client';

export function usePlannedMealEntries(catId: string | undefined, date: string | undefined) {
	return useQuery({
		queryKey: ['mealEntries', catId, date],
		queryFn: () => apiGet<{ mealEntries: MealEntry[] }>('/api/v1/meal-entries', { catId, date }).then((res) => res.mealEntries),
		enabled: catId !== undefined && date !== undefined
	});
}

export function useCreateMealEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: MealEntryInput) => apiPost<{ mealEntry: MealEntry }>('/api/v1/meal-entries', input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['mealEntries'] });
			queryClient.invalidateQueries({ queryKey: ['repartition'] });
		}
	});
}

export function useDeleteMealEntry() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiDelete(`/api/v1/meal-entries/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['mealEntries'] });
			queryClient.invalidateQueries({ queryKey: ['repartition'] });
		}
	});
}
