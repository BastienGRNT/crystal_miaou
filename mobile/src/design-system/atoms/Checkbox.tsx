import { Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, radii } from '../tokens';

interface CheckboxProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	size?: number;
}

export function Checkbox({ checked, onChange, disabled = false, size = 24 }: CheckboxProps) {
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => onChange(!checked)}
			hitSlop={8}
			style={{
				width: size,
				height: size,
				borderRadius: radii.sm,
				borderWidth: checked ? 0 : 1.5,
				borderColor: colors.border,
				backgroundColor: checked ? colors.primary : 'transparent',
				alignItems: 'center',
				justifyContent: 'center',
				opacity: disabled ? 0.5 : 1
			}}
		>
			{checked ? <Check size={size * 0.65} color={colors.primaryForeground} /> : null}
		</Pressable>
	);
}
