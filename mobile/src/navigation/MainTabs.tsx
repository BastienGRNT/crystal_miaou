import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { House, Cat, Drumstick, ChartColumn, Menu } from 'lucide-react-native';
import { HomeStack } from './HomeStack';
import { ChatsScreen } from '../screens/Chats/ChatsScreen';
import { AlimentsScreen } from '../screens/Aliments/AlimentsScreen';
import { AnalyseScreen } from '../screens/Analyse/AnalyseScreen';
import { PlusStack } from './PlusStack';
import { colors } from '../design-system/tokens';

export type MainTabsParamList = {
	Accueil: undefined;
	Chats: undefined;
	Aliments: undefined;
	Analyse: undefined;
	Plus: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Navigation adaptée téléphone (5 onglets), pas un copier-coller des 7 items de la nav web : "Ajouter
// un repas" reste accessible depuis l'Accueil plutôt qu'un onglet dédié, "Routines"/"Comprendre"/
// "Compte" sont regroupés sous "Plus".
export function MainTabs() {
	return (
		<Tab.Navigator
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.mutedForeground,
				tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border }
			}}
		>
			<Tab.Screen name="Accueil" component={HomeStack} options={{ tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
			<Tab.Screen
				name="Chats"
				component={ChatsScreen}
				options={{ tabBarIcon: ({ color, size }) => <Cat color={color} size={size} /> }}
			/>
			<Tab.Screen
				name="Aliments"
				component={AlimentsScreen}
				options={{ tabBarIcon: ({ color, size }) => <Drumstick color={color} size={size} /> }}
			/>
			<Tab.Screen
				name="Analyse"
				component={AnalyseScreen}
				options={{ tabBarIcon: ({ color, size }) => <ChartColumn color={color} size={size} /> }}
			/>
			<Tab.Screen
				name="Plus"
				component={PlusStack}
				options={{ tabBarIcon: ({ color, size }) => <Menu color={color} size={size} /> }}
			/>
		</Tab.Navigator>
	);
}
