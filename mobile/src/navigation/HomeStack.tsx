import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { OnboardingScreen } from '../screens/Auth/OnboardingScreen';
import { colors } from '../design-system/tokens';

export type HomeStackParamList = {
	HomeMain: undefined;
	Onboarding: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

/** Traduit les `href` web ("/aliments", "/repas/routines"...) hérités du domain/score en navigation
 * vers l'onglet correspondant — l'app mobile n'a pas d'URL, seulement des onglets. */
function hrefToTab(href: string): string | null {
	if (href.startsWith('/aliments')) return 'Aliments';
	if (href.startsWith('/repas/routines') || href.startsWith('/repas/ajouter') || href.startsWith('/comprendre')) return 'Plus';
	if (href.startsWith('/chats')) return 'Chats';
	if (href.startsWith('/analyse')) return 'Analyse';
	return null;
}

function HomeMainScreen() {
	const navigation = useNavigation();

	function handleNavigateToHref(href: string) {
		const tab = hrefToTab(href);
		if (tab) navigation.getParent()?.navigate(tab as never);
	}

	return (
		<HomeScreen
			onNavigateToHref={handleNavigateToHref}
			onNavigateToOnboarding={() => navigation.navigate('Onboarding' as never)}
		/>
	);
}

export function HomeStack() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
			<Stack.Screen name="HomeMain" component={HomeMainScreen} />
			<Stack.Screen
				name="Onboarding"
				options={{ headerShown: true, title: 'Nouveau chat', headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.foreground }}
			>
				{({ navigation }) => <OnboardingScreen onCreated={() => navigation.goBack()} />}
			</Stack.Screen>
		</Stack.Navigator>
	);
}
