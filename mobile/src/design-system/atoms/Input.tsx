import { TextInput, type TextInputProps } from 'react-native';
import { colors, fonts, radii, spacing } from '../tokens';

export function Input({ style, ...props }: TextInputProps) {
	return (
		<TextInput
			placeholderTextColor={colors.mutedForeground}
			style={[
				{
					backgroundColor: colors.input,
					borderWidth: 1,
					borderColor: colors.border,
					borderRadius: radii.md,
					paddingVertical: spacing.md,
					paddingHorizontal: spacing.md,
					color: colors.foreground,
					fontFamily: fonts.body,
					fontSize: 15
				},
				style
			]}
			{...props}
		/>
	);
}
