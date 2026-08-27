import { Pressable, ActivityIndicator, type PressableProps } from 'react-native';
import { Text } from './Text';
import { colors, radii, spacing } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps extends Omit<PressableProps, 'children'> {
	label: string;
	variant?: ButtonVariant;
	loading?: boolean;
	fullWidth?: boolean;
}

const variantBg: Record<ButtonVariant, string> = {
	primary: colors.primary,
	secondary: colors.card,
	ghost: 'transparent',
	destructive: colors.destructive
};

const variantFg: Record<ButtonVariant, string> = {
	primary: colors.primaryForeground,
	secondary: colors.foreground,
	ghost: colors.primary,
	destructive: colors.destructiveForeground
};

export function Button({ label, variant = 'primary', loading = false, fullWidth = false, disabled, style, ...props }: ButtonProps) {
	const isDisabled = disabled || loading;

	return (
		<Pressable
			accessibilityRole="button"
			disabled={isDisabled}
			style={(state) => [
				{
					backgroundColor: variantBg[variant],
					borderRadius: radii.md,
					paddingVertical: spacing.md,
					paddingHorizontal: spacing.lg,
					alignItems: 'center',
					justifyContent: 'center',
					flexDirection: 'row',
					gap: spacing.sm,
					opacity: isDisabled ? 0.6 : state.pressed ? 0.85 : 1,
					width: fullWidth ? '100%' : undefined,
					borderWidth: variant === 'secondary' ? 1 : 0,
					borderColor: colors.border
				},
				typeof style === 'function' ? undefined : style
			]}
			{...props}
		>
			{loading ? (
				<ActivityIndicator color={variantFg[variant]} />
			) : (
				<Text variant="bodyMedium" style={{ color: variantFg[variant] }}>
					{label}
				</Text>
			)}
		</Pressable>
	);
}
