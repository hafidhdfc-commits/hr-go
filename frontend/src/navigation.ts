import React from "react";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { makeStyles, fonts, useTheme } from "@/src/theme";

export function roleTabScreenOptions(colors: ReturnType<typeof useTheme>["colors"]) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.brandPrimary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.divider,
      ...(Platform.OS === "web" ? { height: 64 } : {}),
    },
    tabBarItemStyle: { alignSelf: "center" as const },
    tabBarLabelStyle: { fontFamily: fonts.bodySemibold, fontSize: 11 },
  };
}

// placeholder to keep this a module with a hook consumer if needed later
export const useTabStyles = makeStyles(() => ({}));
export { Tabs };
