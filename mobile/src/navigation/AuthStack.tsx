import { useState } from 'react';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';

/** Pas besoin de React Navigation ici : juste deux écrans qui se togglent, aucun historique à gérer
 * avant d'être authentifié. */
export function AuthStack() {
	const [mode, setMode] = useState<'login' | 'register'>('login');

	return mode === 'login' ? (
		<LoginScreen onNavigateToRegister={() => setMode('register')} />
	) : (
		<RegisterScreen onNavigateToLogin={() => setMode('login')} />
	);
}
