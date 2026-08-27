import { useState } from 'react';
import { View, Alert as RNAlert } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import type { CatMember } from '@shared/cat';
import { Text } from '../atoms/Text';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { IconButton } from '../atoms/IconButton';
import { FormField } from '../molecules/FormField';
import { Alert } from '../molecules/Alert';
import { colors, spacing } from '../tokens';
import { useAddCatMember, useCatMembers, useRemoveCatMember } from '../../api/catMembers';
import { useCurrentUser } from '../../api/auth';
import { ApiError } from '../../api/client';

interface HouseholdMembersPanelProps {
	catId: string;
}

export function HouseholdMembersPanel({ catId }: HouseholdMembersPanelProps) {
	const { data: members, isLoading, isError } = useCatMembers(catId);
	const { data: session } = useCurrentUser();
	const currentUserId = session?.user.id;
	const addMember = useAddCatMember(catId);
	const removeMember = useRemoveCatMember(catId);
	const [email, setEmail] = useState('');
	const [inviteError, setInviteError] = useState<string | null>(null);

	async function handleInvite() {
		setInviteError(null);
		if (!email.trim()) {
			setInviteError('Adresse email requise.');
			return;
		}
		try {
			await addMember.mutateAsync(email);
			setEmail('');
		} catch (err) {
			setInviteError(err instanceof ApiError ? err.message : "Impossible d'ajouter cette personne.");
		}
	}

	function handleRemove(member: CatMember) {
		RNAlert.alert(
			member.userId === currentUserId ? 'Quitter le foyer ?' : `Retirer ${member.name} ?`,
			member.userId === currentUserId
				? 'Vous ne verrez plus le suivi de ce chat.'
				: `Retirer ${member.name} du foyer de ce chat ?`,
			[
				{ text: 'Annuler', style: 'cancel' },
				{ text: 'Retirer', style: 'destructive', onPress: () => removeMember.mutate(member.membershipId) }
			]
		);
	}

	return (
		<View style={{ gap: spacing.lg }}>
			<Text variant="caption" color="muted">
				Toute personne du foyer voit le même suivi pour ce chat (repas, routine, poids) — pas besoin de ressaisir
				quoi que ce soit chacun de son côté.
			</Text>

			<View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
				<View style={{ flex: 1 }}>
					<FormField label="Email d'un compte existant">
						<Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="prenom@exemple.fr" />
					</FormField>
				</View>
				<Button label="Ajouter" onPress={handleInvite} loading={addMember.isPending} />
			</View>
			{inviteError ? <Alert variant="error" message={inviteError} /> : null}

			{isLoading ? (
				<Spinner />
			) : isError ? (
				<Alert variant="error" message="Impossible de charger le foyer." />
			) : (
				<View style={{ gap: spacing.xs }}>
					{members?.map((member) => (
						<View
							key={member.membershipId}
							style={{
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
								borderRadius: 10,
								borderWidth: 1,
								borderColor: colors.border,
								backgroundColor: colors.muted,
								paddingVertical: spacing.sm,
								paddingHorizontal: spacing.md
							}}
						>
							<View>
								<Text variant="bodyMedium">
									{member.name}
									{member.userId === currentUserId ? ' (vous)' : ''}
								</Text>
								<Text variant="caption" color="muted">
									{member.email}
								</Text>
							</View>
							<IconButton onPress={() => handleRemove(member)}>
								{removeMember.isPending && removeMember.variables === member.membershipId ? (
									<Spinner />
								) : (
									<Trash2 size={18} color={colors.destructive} />
								)}
							</IconButton>
						</View>
					))}
				</View>
			)}
		</View>
	);
}
