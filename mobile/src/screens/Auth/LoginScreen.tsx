import { useState } from 'react';
import { Text as RNText } from 'react-native';
import { AuthCard } from '../../design-system/organisms/AuthCard';
import { FormField } from '../../design-system/molecules/FormField';
import { Input } from '../../design-system/atoms/Input';
import { Button } from '../../design-system/atoms/Button';
import { Alert } from '../../design-system/molecules/Alert';
import { colors } from '../../design-system/tokens';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';

export function LoginScreen({ onNavigateToRegister }: { onNavigateToRegister: () => void }) {
	const { signIn } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		setError(null);
		setLoading(true);
		try {
			await signIn(email, password);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Connexion impossible.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthCard
			title="Se connecter"
			subtitle="Suivez la nutrition de vos chats."
			footer={
				<RNText style={{ color: colors.mutedForeground }}>
					Pas encore de compte ?{' '}
					<RNText style={{ color: colors.primary }} onPress={onNavigateToRegister}>
						Créer un compte
					</RNText>
				</RNText>
			}
		>
			<FormField label="Email">
				<Input
					value={email}
					onChangeText={setEmail}
					autoCapitalize="none"
					keyboardType="email-address"
					autoComplete="email"
					textContentType="emailAddress"
				/>
			</FormField>

			<FormField label="Mot de passe">
				<Input
					value={password}
					onChangeText={setPassword}
					secureTextEntry
					autoComplete="current-password"
					textContentType="password"
				/>
			</FormField>

			{error ? <Alert variant="error" message={error} /> : null}

			<Button label={loading ? 'Connexion...' : 'Se connecter'} onPress={handleSubmit} loading={loading} fullWidth />
		</AuthCard>
	);
}
