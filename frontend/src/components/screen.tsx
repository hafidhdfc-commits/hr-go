import React from "react";
import { View, ScrollView, RefreshControl, StyleProp, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { AppText } from "@/src/components/ui";

/**
 * Screen for tab roots. Paints full-bleed background; pads content with safe
 * area top. Classic (non-absolute) tab bar sits outside the viewport, so only
 * normal bottom spacing is added.
 */
export function TabScreen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
  onRefresh,
  refreshing,
  headerAccessory,
  testID,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerAccessory?: React.ReactNode;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const header = title ? (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="title">{title}</AppText>
          {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
        </View>
        {right}
      </View>
      {headerAccessory}
    </View>
  ) : (
    <View style={{ height: insets.top }} />
  );

  return (
    <View style={styles.root} testID={testID}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  content: { padding: spacing.xl, paddingBottom: spacing["3xl"], gap: spacing.sm },
}));
