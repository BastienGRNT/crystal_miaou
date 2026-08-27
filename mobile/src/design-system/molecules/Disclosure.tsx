import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Text } from '../atoms/Text';
import { Card } from '../atoms/Card';
import { colors, spacing } from '../tokens';

interface DisclosureProps {
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
}

export function Disclosure({ title, defaultOpen = false, children }: DisclosureProps) {
	const [open, setOpen] = useState(defaultOpen);

	return (
		<Card padded={false}>
			<Pressable
				onPress={() => setOpen((v) => !v)}
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: spacing.lg
				}}
			>
				<Text variant="heading">{title}</Text>
				<ChevronDown
					size={20}
					color={colors.mutedForeground}
					style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
				/>
			</Pressable>
			{open ? <View style={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}>{children}</View> : null}
		</Card>
	);
}
