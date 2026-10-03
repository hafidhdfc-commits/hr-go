// Design tokens for HR-Go. Premium corporate aviation. Light theme.
//
// Keys match the "color" block of /app/design_guidelines.json. Build sheets
// with makeStyles((colors) => ({...})) and read useTheme().colors for color
// props. Never write color literals in components.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#061B3A",
  surfaceSecondary: "#F5F7FA",
  onSurfaceSecondary: "#061B3A",
  surfaceTertiary: "#D9DEE5",
  onSurfaceTertiary: "#061B3A",
  surfaceInverse: "#061B3A",
  onSurfaceInverse: "#FFFFFF",
  muted: "#8D98A6",

  brand: "#061B3A",
  onBrand: "#FFFFFF",
  brandPrimary: "#061B3A",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#8D98A6",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#D9DEE5",
  onBrandTertiary: "#061B3A",

  success: "#1B5E20",
  onSuccess: "#FFFFFF",
  warning: "#B77B00",
  onWarning: "#FFFFFF",
  error: "#B71C1C",
  onError: "#FFFFFF",
  info: "#2E475D",
  onInfo: "#FFFFFF",

  border: "#D9DEE5",
  borderStrong: "#8D98A6",
  divider: "#E8EAF0",

  // extra brand accent for WhatsApp recognition
  whatsapp: "#25D366",
  onWhatsapp: "#FFFFFF",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const fonts = {
  display: "Montserrat-SemiBold",
  displayBold: "Montserrat-Bold",
  displayMedium: "Montserrat-Medium",
  body: "Inter-Regular",
  bodyMedium: "Inter-Medium",
  bodySemibold: "Inter-SemiBold",
  bodyBold: "Inter-Bold",
} as const;

export const fontSize = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
