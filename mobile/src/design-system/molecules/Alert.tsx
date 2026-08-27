import { View } from 'react-native';
import { AlertTriangle, Info, CircleCheck } from 'lucide-react-native';
import { Text } from '../atoms/Text';
import { colors, radii, spacing } from '../tokens';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

interface AlertProps {
	variant?: AlertVariant;
	message: string;
}

const variantConfig: Record<AlertVariant, { fg: string; bg: string; Icon: typeof Info }> = {
	info: { fg: colors.secondary, bg: colors.secondaryMuted, Icon: Info },
	warning: { fg: colors.warning, bg: colors.warningMuted, Icon: AlertTriangle },
	error: { fg: colors.destructive, bg: colors.destructiveMuted, Icon: AlertTriangle },
	success: { fg: colors.success, bg: colors.successMuted, Icon: CircleCheck }
};

export function Alert({ variant = 'info', message }: AlertProps) {
	const { fg, bg, Icon } = variantConfig[variant];
	return (
		<View
			style={{
				flexDirection: 'row',
				gap: spacing.sm,
				backgroundColor: bg,
				borderRadius: radii.md,
				padding: spacing.md,
				alignItems: 'flex-start'
			}}
		>
			<Icon size={18} color={fg} style={{ marginTop: 2 }} />
			<Text variant="caption" style={{ color: fg, flex: 1 }}>
				{message}
			</Text>
		</View>
	);
}
