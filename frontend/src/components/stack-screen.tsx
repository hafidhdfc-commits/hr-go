import React from "react";
import { View, ScrollView } from "react-native";
import { Redirect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { BackHeader, Loading } from "@/src/components/ui";
import { useAuth, Role } from "@/src/auth";

export function StackScreen({
  title,
  subtitle,
  right,
  children,
  roles,
  scroll = true,
  footer,
  testID,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  roles?: Role[];
  scroll?: boolean;
  footer?: React.ReactNode;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (roles && !roles.includes(user.role)) return <Redirect href="/" />;

  return (
    <View style={styles.root} testID={testID}>
      <View style={{ paddingTop: insets.top + spacing.md }}>
        <BackHeader title={title} subtitle={subtitle} right={right} />
      </View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing["3xl"] }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.xl, gap: spacing.sm },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
}));
