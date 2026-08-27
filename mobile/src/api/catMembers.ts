import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CatMember } from '@shared/cat';
import { apiDelete, apiGet, apiPost } from './client';

export function useCatMembers(catId: string) {
	return useQuery({
		queryKey: ['catMembers', catId],
		queryFn: () => apiGet<{ members: CatMember[] }>(`/api/cats/${catId}/members`).then((res) => res.members)
	});
}

export function useAddCatMember(catId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (email: string) => apiPost<{ member: CatMember }>(`/api/cats/${catId}/members`, { email }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['catMembers', catId] });
		}
	});
}

export function useRemoveCatMember(catId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (membershipId: string) => apiDelete(`/api/cats/${catId}/members/${membershipId}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['catMembers', catId] });
		}
	});
}
