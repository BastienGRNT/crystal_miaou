import { useState } from 'react';
import { View } from 'react-native';
import RNSlider from '@react-native-community/slider';
import { Text } from '../atoms/Text';
import { colors, spacing } from '../tokens';

interface QuantitySliderProps {
	value: number;
	minimumValue?: number;
	maximumValue: number;
	/** Pas d'affichage uniquement (confort de drag) — la valeur réellement persistée est toujours
	 * re-arrondie côté API au commit (CLAUDE.md règle 9), jamais garantie par ce pas seul. */
	step: number;
	/** Formatte la valeur affichée pendant le drag (ex. "3 paquets", "120 g") — affichage pur. */
	formatValue: (value: number) => string;
	onCommit: (value: number) => void;
	disabled?: boolean;
}

export function QuantitySlider({
	value,
	minimumValue = 0,
	maximumValue,
	step,
	formatValue,
	onCommit,
	disabled = false
}: QuantitySliderProps) {
	const [localValue, setLocalValue] = useState(value);

	return (
		<View style={{ gap: spacing.xs }}>
			<Text variant="bodyMedium" color="primary" style={{ textAlign: 'center' }}>
				{formatValue(localValue)}
			</Text>
			<RNSlider
				value={value}
				minimumValue={minimumValue}
				maximumValue={Math.max(maximumValue, minimumValue + step)}
				step={step}
				disabled={disabled}
				minimumTrackTintColor={colors.primary}
				maximumTrackTintColor={colors.muted}
				thumbTintColor={colors.primary}
				onValueChange={setLocalValue}
				onSlidingComplete={onCommit}
			/>
		</View>
	);
}
