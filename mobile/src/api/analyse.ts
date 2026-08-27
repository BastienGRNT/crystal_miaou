import { useQuery } from '@tanstack/react-query';
import type { AnalyseErrorResponse, AnalyseOkResponse } from '@shared/analyse';
import { ApiError, apiGet } from './client';

export function useAnalyse(catId: string | undefined, days: number) {
	return useQuery({
		queryKey: ['analyse', catId, days],
		queryFn: async () => {
			const result = await apiGet<AnalyseOkResponse | AnalyseErrorResponse>('/api/v1/analyse', { catId, days });
			if (!result.success) throw new ApiError(400, result.error);
			return result;
		},
		enabled: catId !== undefined
	});
}
