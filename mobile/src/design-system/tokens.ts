// Palette / rayons / ombres portés 1:1 depuis app/src/routes/layout.css (thème sombre unique — l'app
// web n'a pas de thème clair non plus). Ne jamais dupliquer une valeur de couleur ailleurs : tout
// composant importe depuis ce fichier.

export const colors = {
	background: '#16130f',
	foreground: '#f2ece2',
	card: '#1e1a15',
	cardForeground: '#f2ece2',
	popover: '#221d17',
	popoverForeground: '#f2ece2',

	muted: '#2a241d',
	mutedForeground: '#a89c8a',

	border: '#362f26',
	input: '#362f26',
	ring: '#e8935a',

	primary: '#e8935a',
	primaryForeground: '#1a1208',
	primaryMuted: 'rgba(232, 147, 90, 0.16)',

	secondary: '#4fa89b',
	secondaryForeground: '#0c1a17',
	secondaryMuted: 'rgba(79, 168, 155, 0.16)',

	success: '#7fb069',
	successMuted: 'rgba(127, 176, 105, 0.16)',
	warning: '#e0b04a',
	warningMuted: 'rgba(224, 176, 74, 0.16)',
	destructive: '#d9695f',
	destructiveForeground: '#1a0f0d',
	destructiveMuted: 'rgba(217, 105, 95, 0.16)'
} as const;

export const radii = {
	sm: 6,
	md: 10,
	lg: 16,
	xl: 22,
	full: 999
} as const;

export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32
} as const;

export const fonts = {
	heading: 'Manrope_700Bold',
	headingSemibold: 'Manrope_600SemiBold',
	body: 'Inter_400Regular',
	bodyMedium: 'Inter_500Medium',
	bodySemibold: 'Inter_600SemiBold'
} as const;

/** Couleur + fond associé pour chaque statut nutriment/jour — même mapping que les badges web
 * (Badge.svelte variant DEFICIT/EXCES/ATTENTION/OK). */
export const statutColors = {
	OK: { fg: colors.success, bg: colors.successMuted },
	DEFICIT: { fg: colors.destructive, bg: colors.destructiveMuted },
	EXCES: { fg: colors.destructive, bg: colors.destructiveMuted },
	ATTENTION: { fg: colors.warning, bg: colors.warningMuted },
	SANS_DONNEE: { fg: colors.mutedForeground, bg: colors.muted }
} as const;
