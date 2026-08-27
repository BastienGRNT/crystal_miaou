import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../atoms/Text';
import { colors, radii, spacing } from '../tokens';

export interface TabOption<T extends string> {
	label: string;
	value: T;
}

interface TabsProps<T extends string> {
	value: T;
	options: TabOption<T>[];
	onChange: (value: T) => void;
}

export function Tabs<T extends string>({ value, options, onChange }: TabsProps<T>) {
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false}>
			<View style={{ flexDirection: 'row', backgroundColor: colors.muted, borderRadius: radii.full, padding: 4, gap: 4 }}>
				{options.map((option) => {
					const active = option.value === value;
					return (
						<Pressable
							key={option.value}
							onPress={() => onChange(option.value)}
							style={{
								paddingVertical: spacing.sm,
								paddingHorizontal: spacing.md,
								borderRadius: radii.full,
								backgroundColor: active ? colors.card : 'transparent'
							}}
						>
							<Text variant="bodyMedium" color={active ? 'primary' : 'muted'}>
								{option.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</ScrollView>
	);
}
