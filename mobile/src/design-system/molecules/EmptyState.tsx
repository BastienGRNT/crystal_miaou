import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text } from '../atoms/Text';
import { colors, spacing } from '../tokens';

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
	return (
		<View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg }}>
			<Icon size={32} color={colors.mutedForeground} />
			<Text variant="heading" style={{ textAlign: 'center' }}>
				{title}
			</Text>
			{description ? (
				<Text color="muted" style={{ textAlign: 'center' }}>
					{description}
				</Text>
			) : null}
			{children ? <View style={{ marginTop: spacing.md, width: '100%' }}>{children}</View> : null}
		</View>
	);
}
