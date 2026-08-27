import { View, type ViewProps } from 'react-native';
import { colors, radii, spacing } from '../tokens';

interface CardProps extends ViewProps {
	padded?: boolean;
}

export function Card({ style, padded = true, ...props }: CardProps) {
	return (
		<View
			style={[
				{
					backgroundColor: colors.card,
					borderRadius: radii.lg,
					borderWidth: 1,
					borderColor: colors.border,
					padding: padded ? spacing.lg : 0
				},
				style
			]}
			{...props}
		/>
	);
}
