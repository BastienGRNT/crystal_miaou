import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Couleurs et polices calquées sur `app/src/routes/layout.css` (@theme Tailwind du web),
/// pour que l'app mobile reste visuellement cohérente avec le site — cf. CLAUDE.md
/// ("mêmes couleurs/polices, mais layouts et composants propres").
class AppColors {
  AppColors._();

  static const background = Color(0xFF16130F);
  static const foreground = Color(0xFFF2ECE2);
  static const card = Color(0xFF1E1A15);
  static const cardForeground = Color(0xFFF2ECE2);
  static const popover = Color(0xFF221D17);

  static const muted = Color(0xFF2A241D);
  static const mutedForeground = Color(0xFFA89C8A);

  static const border = Color(0xFF362F26);
  static const ring = Color(0xFFE8935A);

  static const primary = Color(0xFFE8935A);
  static const primaryForeground = Color(0xFF1A1208);

  static const secondary = Color(0xFF4FA89B);
  static const secondaryForeground = Color(0xFF0C1A17);

  static const success = Color(0xFF7FB069);
  static const warning = Color(0xFFE0B04A);
  static const destructive = Color(0xFFD9695F);
  static const destructiveForeground = Color(0xFF1A0F0D);
}

class AppRadius {
  AppRadius._();

  static const sm = 6.0;
  static const md = 10.0;
  static const lg = 16.0;
  static const xl = 22.0;
  static const full = 999.0;
}

ThemeData buildAppTheme() {
  final headingFont = GoogleFonts.manropeTextTheme();
  final bodyFont = GoogleFonts.interTextTheme();

  final base = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.dark(
      surface: AppColors.background,
      primary: AppColors.primary,
      onPrimary: AppColors.primaryForeground,
      secondary: AppColors.secondary,
      onSecondary: AppColors.secondaryForeground,
      error: AppColors.destructive,
      onError: AppColors.destructiveForeground,
      outline: AppColors.border,
    ),
  );

  return base.copyWith(
    textTheme: bodyFont.copyWith(
      headlineLarge: headingFont.headlineLarge?.copyWith(color: AppColors.foreground, fontWeight: FontWeight.w700),
      headlineMedium: headingFont.headlineMedium?.copyWith(color: AppColors.foreground, fontWeight: FontWeight.w700),
      headlineSmall: headingFont.headlineSmall?.copyWith(color: AppColors.foreground, fontWeight: FontWeight.w700),
      titleLarge: headingFont.titleLarge?.copyWith(color: AppColors.foreground, fontWeight: FontWeight.w700),
      bodyLarge: bodyFont.bodyLarge?.copyWith(color: AppColors.foreground),
      bodyMedium: bodyFont.bodyMedium?.copyWith(color: AppColors.foreground),
      bodySmall: bodyFont.bodySmall?.copyWith(color: AppColors.mutedForeground),
    ),
    cardTheme: const CardThemeData(
      color: AppColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.lg)),
        side: BorderSide(color: AppColors.border),
      ),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.foreground,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.card,
      indicatorColor: AppColors.primary.withValues(alpha: 0.16),
      labelTextStyle: WidgetStateProperty.all(
        bodyFont.bodySmall?.copyWith(color: AppColors.foreground),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.muted,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    ),
    dividerColor: AppColors.border,
  );
}
