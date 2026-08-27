import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Pressable, Alert as RNAlert } from 'react-native';
import { CalendarClock, CirclePlus, BookOpen, LogOut, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { RoutinesScreen } from '../screens/Routines/RoutinesScreen';
import { AjouterRepasScreen } from '../screens/AjouterRepas/AjouterRepasScreen';
import { ComprendreScreen } from '../screens/Comprendre/ComprendreScreen';
import { PageHeader } from '../design-system/molecules/PageHeader';
import { Card } from '../design-system/atoms/Card';
import { Text } from '../design-system/atoms/Text';
import { colors, spacing } from '../design-system/tokens';
import { useAuth } from '../auth/AuthContext';

export type PlusStackParamList = {
	PlusMenu: undefined;
	Routines: undefined;
	AjouterRepas: undefined;
	Comprendre: undefined;
};

const Stack = createNativeStackNavigator<PlusStackParamList>();

function MenuRow({ icon: Icon, label, onPress, destructive = false }: { icon: LucideIcon; label: string; onPress: () => void; destructive?: boolean }) {
	return (
		<Pressable onPress={onPress}>
			<Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
				<Icon size={20} color={destructive ? colors.destructive : colors.primary} />
				<Text variant="bodyMedium" color={destructive ? 'destructive' : 'default'} style={{ flex: 1 }}>
					{label}
				</Text>
				{!destructive ? <ChevronRight size={18} color={colors.mutedForeground} /> : null}
			</Card>
		</Pressable>
	);
}

function PlusMenuScreen({ navigation }: { navigation: { navigate: (screen: keyof PlusStackParamList) => void } }) {
	const { signOut } = useAuth();

	function handleSignOut() {
		RNAlert.alert('Se déconnecter ?', undefined, [
			{ text: 'Annuler', style: 'cancel' },
			{ text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() }
		]);
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md }}>
			<PageHeader title="Plus" />
			<MenuRow icon={CalendarClock} label="Routines" onPress={() => navigation.navigate('Routines')} />
			<MenuRow icon={CirclePlus} label="Ajouter un repas" onPress={() => navigation.navigate('AjouterRepas')} />
			<MenuRow icon={BookOpen} label="Comprendre le calcul" onPress={() => navigation.navigate('Comprendre')} />
			<MenuRow icon={LogOut} label="Se déconnecter" onPress={handleSignOut} destructive />
		</View>
	);
}

export function PlusStack() {
	return (
		<Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.foreground, contentStyle: { backgroundColor: colors.background } }}>
			<Stack.Screen name="PlusMenu" component={PlusMenuScreen} options={{ headerShown: false }} />
			<Stack.Screen name="Routines" component={RoutinesScreen} options={{ title: 'Routines' }} />
			<Stack.Screen name="AjouterRepas" component={AjouterRepasScreen} options={{ title: 'Ajouter un repas' }} />
			<Stack.Screen name="Comprendre" component={ComprendreScreen} options={{ title: 'Comprendre' }} />
		</Stack.Navigator>
	);
}
