import type { ReactNode } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { PawPrint } from 'lucide-react-native';
import { Text } from '../atoms/Text';
import { Card } from '../atoms/Card';
import { colors, radii, spacing } from '../tokens';

interface AuthCardProps {
	title: string;
	subtitle?: string;
	children: ReactNode;
	footer?: ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}>
				<View style={{ alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
					<View
						style={{
							width: 56,
							height: 56,
							borderRadius: radii.xl,
							backgroundColor: colors.primary,
							alignItems: 'center',
							justifyContent: 'center'
						}}
					>
						<PawPrint size={26} color={colors.primaryForeground} />
					</View>
					<Text variant="title">{title}</Text>
					{subtitle ? <Text color="muted">{subtitle}</Text> : null}
				</View>

				<Card style={{ gap: spacing.md }}>{children}</Card>

				{footer ? <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>{footer}</View> : null}
			</ScrollView>
		</KeyboardAvoidingView>
	);
}
