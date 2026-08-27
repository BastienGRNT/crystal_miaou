import { useState } from 'react';
import { Modal, Pressable, View, FlatList } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { Text } from './Text';
import { colors, radii, spacing } from '../tokens';

export interface SelectOption<T extends string> {
	label: string;
	value: T;
}

interface SelectProps<T extends string> {
	value: T;
	options: SelectOption<T>[];
	onChange: (value: T) => void;
	placeholder?: string;
}

export function Select<T extends string>({ value, options, onChange, placeholder }: SelectProps<T>) {
	const [open, setOpen] = useState(false);
	const selected = options.find((option) => option.value === value);

	return (
		<>
			<Pressable
				onPress={() => setOpen(true)}
				style={{
					backgroundColor: colors.input,
					borderWidth: 1,
					borderColor: colors.border,
					borderRadius: radii.md,
					paddingVertical: spacing.md,
					paddingHorizontal: spacing.md,
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between'
				}}
			>
				<Text color={selected ? 'default' : 'muted'}>{selected?.label ?? placeholder ?? 'Sélectionner…'}</Text>
				<ChevronDown size={18} color={colors.mutedForeground} />
			</Pressable>
			<Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
				<Pressable
					style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
					onPress={() => setOpen(false)}
				>
					<View
						style={{
							backgroundColor: colors.popover,
							borderTopLeftRadius: radii.xl,
							borderTopRightRadius: radii.xl,
							paddingVertical: spacing.md,
							maxHeight: '60%'
						}}
					>
						<FlatList
							data={options}
							keyExtractor={(item) => item.value}
							renderItem={({ item }) => (
								<Pressable
									onPress={() => {
										onChange(item.value);
										setOpen(false);
									}}
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'space-between',
										paddingVertical: spacing.md,
										paddingHorizontal: spacing.lg
									}}
								>
									<Text color={item.value === value ? 'primary' : 'default'}>{item.label}</Text>
									{item.value === value ? <Check size={18} color={colors.primary} /> : null}
								</Pressable>
							)}
						/>
					</View>
				</Pressable>
			</Modal>
		</>
	);
}
