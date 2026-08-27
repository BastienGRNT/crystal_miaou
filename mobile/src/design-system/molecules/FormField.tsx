import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../atoms/Text';
import { spacing } from '../tokens';

interface FormFieldProps {
	label: string;
	error?: string;
	children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
	return (
		<View style={{ gap: spacing.xs }}>
			<Text variant="bodyMedium">{label}</Text>
			{children}
			{error ? (
				<Text variant="caption" color="destructive">
					{error}
				</Text>
			) : null}
		</View>
	);
}
