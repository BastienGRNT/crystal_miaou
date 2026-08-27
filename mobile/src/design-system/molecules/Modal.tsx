import { Modal as RNModal, Pressable, View, ScrollView, type ReactNode } from 'react-native';
import { X } from 'lucide-react-native';
import { Text } from '../atoms/Text';
import { IconButton } from '../atoms/IconButton';
import { colors, radii, spacing } from '../tokens';

interface ModalProps {
	visible: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
	return (
		<RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
				<Pressable style={{ flex: 1 }} onPress={onClose} />
				<View
					style={{
						backgroundColor: colors.popover,
						borderTopLeftRadius: radii.xl,
						borderTopRightRadius: radii.xl,
						maxHeight: '90%',
						paddingBottom: spacing.xl
					}}
				>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: spacing.lg,
							borderBottomWidth: 1,
							borderBottomColor: colors.border
						}}
					>
						<Text variant="subtitle">{title}</Text>
						<IconButton onPress={onClose} variant="muted">
							<X size={18} color={colors.foreground} />
						</IconButton>
					</View>
					<ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>{children}</ScrollView>
				</View>
			</View>
		</RNModal>
	);
}
