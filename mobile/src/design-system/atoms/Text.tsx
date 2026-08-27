import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '../tokens';

export type TextVariant = 'title' | 'subtitle' | 'heading' | 'body' | 'bodyMedium' | 'caption';
export type TextColor = 'default' | 'muted' | 'primary' | 'secondary' | 'destructive' | 'success' | 'warning';

interface TextProps extends RNTextProps {
	variant?: TextVariant;
	color?: TextColor;
}

const variantStyles: Record<TextVariant, TextStyle> = {
	title: { fontFamily: fonts.heading, fontSize: 26, letterSpacing: -0.3 },
	subtitle: { fontFamily: fonts.heading, fontSize: 18 },
	heading: { fontFamily: fonts.headingSemibold, fontSize: 16 },
	body: { fontFamily: fonts.body, fontSize: 15 },
	bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15 },
	caption: { fontFamily: fonts.body, fontSize: 13 }
};

const colorMap: Record<TextColor, string> = {
	default: colors.foreground,
	muted: colors.mutedForeground,
	primary: colors.primary,
	secondary: colors.secondary,
	destructive: colors.destructive,
	success: colors.success,
	warning: colors.warning
};

export function Text({ variant = 'body', color = 'default', style, ...props }: TextProps) {
	return <RNText style={[variantStyles[variant], { color: colorMap[color] }, style]} {...props} />;
}
