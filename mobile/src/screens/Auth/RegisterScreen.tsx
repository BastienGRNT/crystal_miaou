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

export function RegisterScreen({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
	const { signUp } = useAuth();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		setError(null);
		setLoading(true);
		try {
			await signUp(email, password, name);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : 'Inscription impossible.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthCard
			title="Créer un compte"
			subtitle="Suivez la nutrition de vos chats."
			footer={
				<RNText style={{ color: colors.mutedForeground }}>
					Déjà un compte ?{' '}
					<RNText style={{ color: colors.primary }} onPress={onNavigateToLogin}>
						Se connecter
					</RNText>
				</RNText>
			}
		>
			<FormField label="Nom">
				<Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
			</FormField>

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
					autoComplete="new-password"
					textContentType="newPassword"
				/>
			</FormField>

			{error ? <Alert variant="error" message={error} /> : null}

			<Button label={loading ? 'Création...' : 'Créer mon compte'} onPress={handleSubmit} loading={loading} fullWidth />
		</AuthCard>
	);
}
