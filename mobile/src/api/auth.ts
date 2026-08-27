import { useQuery } from '@tanstack/react-query';
import { apiGet } from './client';

interface SessionResponse {
	session: { id: string; userId: string; expiresAt: string };
	user: { id: string; name: string; email: string };
}

/** `GET /api/auth/get-session` — endpoint standard better-auth (celui que son propre client web
 * appelle), fonctionne aussi bien via cookie (web) que via le header `Authorization: Bearer` posé par
 * `apiGet` (mobile), le plugin `bearer` traitant les deux de façon équivalente côté serveur. */
export function useCurrentUser() {
	return useQuery({
		queryKey: ['currentUser'],
		queryFn: () => apiGet<SessionResponse | null>('/api/auth/get-session'),
		staleTime: 5 * 60_000
	});
}
