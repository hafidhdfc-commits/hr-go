import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { CaretRight, SignOut } from "phosphor-react-native";
import { AppText } from "@/src/components/ui";
import { TabScreen } from "@/src/components/screen";
import { makeStyles, spacing, radius, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";

export type MoreItem = { label: string; to?: string; onPress?: () => void };

export function MoreMenu({ title, subtitle, sections }: { title: string; subtitle: string; sections: { heading: string; items: MoreItem[] }[] }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <TabScreen title={title} subtitle={subtitle} testID="more-screen">
      <View style={styles.profile}>
        <AppText variant="heading">{user?.full_name}</AppText>
        <AppText variant="caption">
          {user?.role} · {user?.email || user?.phone}
        </AppText>
      </View>

      {sections.map((sec) => (
        <View key={sec.heading}>
          <AppText variant="label" style={styles.heading}>
            {sec.heading}
          </AppText>
          <View style={styles.group}>
            {sec.items.map((it, i) => (
              <Pressable
                key={it.label}
                testID={`more-${it.label}`}
                style={[styles.row, i < sec.items.length - 1 && styles.rowBorder]}
                onPress={() => (it.onPress ? it.onPress() : it.to ? router.push(it.to as any) : null)}
              >
                <AppText variant="body">{it.label}</AppText>
                <CaretRight size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Pressable testID="logout-button" style={styles.logout} onPress={logout}>
        <SignOut size={18} color={colors.error} weight="bold" />
        <AppText variant="bodyMedium" color="error">
          Log out
        </AppText>
      </Pressable>
    </TabScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  profile: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  heading: { letterSpacing: 1, textTransform: "uppercase", marginTop: spacing.lg, marginBottom: spacing.sm },
  group: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
}));
