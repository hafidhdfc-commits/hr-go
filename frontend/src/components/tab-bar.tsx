import React from "react";
import { View, Pressable, Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { makeStyles, fonts, spacing, useTheme } from "@/src/theme";

export type TabDef = { name: string; label: string; icon: React.ComponentType<any> };

export function makeTabBar(tabs: TabDef[]) {
  return function CustomTabBar({ state, navigation }: BottomTabBarProps) {
    const styles = useStyles();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    return (
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {state.routes.map((route, index) => {
          const def = tabs.find((t) => t.name === route.name);
          if (!def) return null;
          const focused = state.index === index;
          const color = focused ? colors.brandPrimary : colors.muted;
          const IconCmp = def.icon;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable key={route.key} testID={`tab-${route.name}`} style={styles.item} onPress={onPress} accessibilityRole="button">
              {IconCmp ? <IconCmp size={24} color={color} weight={focused ? "fill" : "regular"} /> : null}
              <Text style={[styles.label, { color }]}>{def.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } }
      : {}),
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  label: { fontFamily: fonts.bodySemibold, fontSize: 11 },
}));
