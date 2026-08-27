import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authRequest, clearToken, getToken } from '../api/client';

interface AuthContextValue {
	isAuthenticated: boolean;
	/** Faux tant que la lecture du token stocké n'est pas terminée — évite un flash de l'écran de login
	 * au démarrage si un token est déjà présent. */
	checkedStoredToken: boolean;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (email: string, password: string, name: string) => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [checkedStoredToken, setCheckedStoredToken] = useState(false);

	useEffect(() => {
		getToken().then((token) => {
			setIsAuthenticated(token !== null);
			setCheckedStoredToken(true);
		});
	}, []);

	const signIn = useCallback(async (email: string, password: string) => {
		await authRequest('/api/auth/sign-in/email', { email, password });
		setIsAuthenticated(true);
	}, []);

	const signUp = useCallback(async (email: string, password: string, name: string) => {
		await authRequest('/api/auth/sign-up/email', { email, password, name });
		setIsAuthenticated(true);
	}, []);

	const signOut = useCallback(async () => {
		await clearToken();
		setIsAuthenticated(false);
	}, []);

	const value = useMemo(
		() => ({ isAuthenticated, checkedStoredToken, signIn, signUp, signOut }),
		[isAuthenticated, checkedStoredToken, signIn, signUp, signOut]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth doit être utilisé sous AuthProvider.');
	return context;
}
