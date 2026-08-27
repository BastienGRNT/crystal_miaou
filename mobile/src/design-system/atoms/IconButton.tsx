import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { colors, radii } from '../tokens';

interface IconButtonProps extends PressableProps {
	children: ReactNode;
	variant?: 'ghost' | 'muted';
}

export function IconButton({ children, variant = 'ghost', style, ...props }: IconButtonProps) {
	return (
		<Pressable
			hitSlop={8}
			style={(state) => [
				{
					width: 40,
					height: 40,
					borderRadius: radii.full,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: variant === 'muted' ? colors.muted : 'transparent',
					opacity: state.pressed ? 0.6 : 1
				},
				typeof style === 'function' ? undefined : style
			]}
			{...props}
		>
			{children}
		</Pressable>
	);
}
