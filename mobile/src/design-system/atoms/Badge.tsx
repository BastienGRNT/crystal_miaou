import { View } from 'react-native';
import { Text } from './Text';
import { colors, radii, spacing } from '../tokens';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';

interface BadgeProps {
	label: string;
	variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; fg: string }> = {
	default: { bg: colors.muted, fg: colors.mutedForeground },
	primary: { bg: colors.primaryMuted, fg: colors.primary },
	secondary: { bg: colors.secondaryMuted, fg: colors.secondary },
	success: { bg: colors.successMuted, fg: colors.success },
	warning: { bg: colors.warningMuted, fg: colors.warning },
	destructive: { bg: colors.destructiveMuted, fg: colors.destructive }
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
	const { bg, fg } = variantColors[variant];
	return (
		<View
			style={{
				backgroundColor: bg,
				borderRadius: radii.full,
				paddingVertical: spacing.xs / 2,
				paddingHorizontal: spacing.sm,
				alignSelf: 'flex-start'
			}}
		>
			<Text variant="caption" style={{ color: fg }}>
				{label}
			</Text>
		</View>
	);
}
