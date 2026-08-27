import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../atoms/Text';
import { spacing } from '../tokens';

interface PageHeaderProps {
	title: string;
	subtitle?: string;
	right?: ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
	return (
		<View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md }}>
			<View style={{ gap: 2, flex: 1 }}>
				<Text variant="title">{title}</Text>
				{subtitle ? <Text color="muted">{subtitle}</Text> : null}
			</View>
			{right}
		</View>
	);
}
