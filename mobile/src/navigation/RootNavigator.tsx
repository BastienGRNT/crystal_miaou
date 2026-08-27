import { View } from 'react-native';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { Spinner } from '../design-system/atoms/Spinner';
import { colors } from '../design-system/tokens';
import { useAuth } from '../auth/AuthContext';

const navigationTheme: Theme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		background: colors.background,
		card: colors.card,
		text: colors.foreground,
		border: colors.border,
		primary: colors.primary
	}
};

export function RootNavigator() {
	const { isAuthenticated, checkedStoredToken } = useAuth();

	if (!checkedStoredToken) {
		return (
			<View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
				<Spinner />
			</View>
		);
	}

	return <NavigationContainer theme={navigationTheme}>{isAuthenticated ? <MainTabs /> : <AuthStack />}</NavigationContainer>;
}
