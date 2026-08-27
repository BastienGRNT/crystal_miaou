import type { ExpoConfig } from 'expo/config';

// URL de base de l'API (app/ web+API), résolue au build.
// - Par défaut : serveur de prod déployé — c'est ce que doit cibler un APK installé sur un téléphone,
//   y compris une release buildée directement via `gradlew assembleRelease` (qui ne passe par aucune
//   commande `expo` capable de distinguer "dev" de "release" au moment où ce fichier s'exécute).
// - En dev local (émulateur, `npm run android` / `expo run:android`) : passer explicitement
//   `API_BASE_URL=http://10.0.2.2:5173` (10.0.2.2 alias le "localhost" de l'hôte depuis l'émulateur),
//   ou l'IP LAN de la machine pour tester sur un téléphone physique en debug.
const apiBaseUrl = process.env.API_BASE_URL ?? 'https://miaou.bastiengrnt.fr';

const config: ExpoConfig = {
	name: 'Crystal Miaou',
	slug: 'crystal-miaou',
	scheme: 'crystalmiaou',
	version: '1.0.0',
	orientation: 'portrait',
	icon: './assets/icon.png',
	userInterfaceStyle: 'dark',
	ios: {
		supportsTablet: true
	},
	android: {
		package: 'com.crystalmiaou.app',
		adaptiveIcon: {
			backgroundColor: '#16130f',
			foregroundImage: './assets/android-icon-foreground.png',
			backgroundImage: './assets/android-icon-background.png',
			monochromeImage: './assets/android-icon-monochrome.png'
		},
		predictiveBackGestureEnabled: false
	},
	web: {
		favicon: './assets/favicon.png'
	},
	plugins: [
		'expo-secure-store',
		'expo-font',
		'expo-splash-screen',
		[
			'expo-image-picker',
			{
				photosPermission: "Crystal Miaou a besoin d'accéder à vos photos pour scanner une étiquette.",
				cameraPermission: 'Crystal Miaou a besoin de la caméra pour photographier une étiquette.'
			}
		]
	],
	extra: {
		apiBaseUrl
	}
};

export default config;
