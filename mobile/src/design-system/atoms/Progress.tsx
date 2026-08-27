import { View } from 'react-native';
import { colors, radii } from '../tokens';

interface ProgressProps {
	/** Position déjà calculée par l'API (0-100) — jamais recalculée ici. */
	positionPct: number;
	color?: string;
	trackColor?: string;
	height?: number;
}

export function Progress({ positionPct, color = colors.primary, trackColor = colors.muted, height = 8 }: ProgressProps) {
	const clamped = Math.max(0, Math.min(100, positionPct));
	return (
		<View style={{ height, borderRadius: radii.full, backgroundColor: trackColor, overflow: 'hidden' }}>
			<View style={{ width: `${clamped}%`, height: '100%', borderRadius: radii.full, backgroundColor: color }} />
		</View>
	);
}
