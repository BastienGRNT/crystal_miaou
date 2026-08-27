import { useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './src/api/queryClient';
import { AuthProvider } from './src/auth/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/design-system/tokens';

SplashScreen.preventAutoHideAsync();

export default function App() {
	const [fontsLoaded] = useFonts({
		Manrope_600SemiBold,
		Manrope_700Bold,
		Inter_400Regular,
		Inter_500Medium,
		Inter_600SemiBold
	});

	const onLayoutRootView = useCallback(async () => {
		if (fontsLoaded) await SplashScreen.hideAsync();
	}, [fontsLoaded]);

	if (!fontsLoaded) return null;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
			<SafeAreaProvider>
				<QueryClientProvider client={queryClient}>
					<AuthProvider>
						<RootNavigator />
					</AuthProvider>
				</QueryClientProvider>
			</SafeAreaProvider>
			<StatusBar style="light" />
		</View>
	);
}
