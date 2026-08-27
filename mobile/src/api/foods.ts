import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Food, FoodInput, FoodType } from '@shared/food';
import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export function useFoods(type?: FoodType) {
	return useQuery({
		queryKey: ['foods', type ?? 'all'],
		queryFn: () => apiGet<{ foods: Food[] }>('/api/foods', { type }).then((res) => res.foods)
	});
}

function useInvalidateFoods() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: ['foods'] });
}

export function useCreateFood() {
	const invalidate = useInvalidateFoods();
	return useMutation({
		mutationFn: (input: FoodInput) => apiPost<{ food: Food }>('/api/foods', input),
		onSuccess: invalidate
	});
}

export function useUpdateFood(id: string) {
	const invalidate = useInvalidateFoods();
	return useMutation({
		mutationFn: (input: FoodInput) => apiPatch<{ food: Food }>(`/api/foods/${id}`, input),
		onSuccess: invalidate
	});
}

export function useDeleteFood() {
	const invalidate = useInvalidateFoods();
	return useMutation({
		mutationFn: (id: string) => apiDelete(`/api/foods/${id}`),
		onSuccess: invalidate
	});
}
