import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Cat, CatDerAjustementPct, CatFoodSelectionInput, CatProfileInput } from '@shared/cat';
import { apiGet, apiPatch } from './client';

interface CatsResponse {
	cats: Cat[];
	derAjustementPctValeurs: CatDerAjustementPct[];
}

export function useCats() {
	return useQuery({
		queryKey: ['cats'],
		queryFn: () => apiGet<CatsResponse>('/api/cats')
	});
}

/** Couvre aussi bien la sélection d'aliments actifs (FoodSelection) que l'ajustement manuel du nombre
 * de paquets de pâtée (RationDetails) — les deux passent par le même endpoint `PATCH /api/cats/:id`. */
export function usePatchCatFoodSelection(catId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: Partial<CatFoodSelectionInput>) => apiPatch<{ cat: Cat }>(`/api/cats/${catId}`, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['cats'] });
			queryClient.invalidateQueries({ queryKey: ['repartition'] });
		}
	});
}

export function usePatchCatProfile(catId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CatProfileInput) => apiPatch<{ cat: Cat }>(`/api/cats/${catId}`, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['cats'] });
		}
	});
}

export function usePatchCatDerAjustement(catId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (derAjustementPct: CatDerAjustementPct) =>
			apiPatch<{ cat: Cat }>(`/api/cats/${catId}`, { derAjustementPct }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['cats'] });
		}
	});
}
