import { View, FlatList, Pressable, RefreshControl } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Phone, EnvelopeSimple } from "phosphor-react-native";
import { AppText, Badge, Loading, EmptyState, ChipRow } from "@/src/components/ui";
import { makeStyles, spacing, radius, useTheme } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { fmtDate, userStatusKind, initials } from "@/src/format";
import type { User } from "@/src/auth";

const ROLE_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OWNER", label: "Owner" },
  { key: "ADMIN", label: "Admin" },
  { key: "DRIVER", label: "Driver" },
];

export default function UserManagement() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [role, setRole] = useState("ALL");
  const { data, isLoading, refetch, isRefetching } = useGet<User[]>(["users"], "/users");

  const filtered = (data || []).filter((u) => role === "ALL" || u.role === role);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title">User Management</AppText>
        <AppText variant="caption">All owner, admin & driver accounts</AppText>
      </View>
      <View style={styles.chips}>
        <ChipRow options={ROLE_FILTERS} value={role} onChange={setRole} />
      </View>
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} testID={`user-${item.id}`} onPress={() => router.push(`/user-form?id=${item.id}`)}>
              <View style={styles.avatar}>
                <AppText variant="bodyMedium" color="onBrandPrimary">
                  {initials(item.full_name).toUpperCase()}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <AppText variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                    {item.full_name}
                  </AppText>
                  <Badge label={item.status} kind={userStatusKind(item.status)} />
                </View>
                <AppText variant="caption">{item.role}</AppText>
                <View style={styles.metaRow}>
                  {item.phone ? (
                    <View style={styles.meta}>
                      <Phone size={12} color={colors.muted} />
                      <AppText variant="caption">{item.phone}</AppText>
                    </View>
                  ) : null}
                  {item.email ? (
                    <View style={styles.meta}>
                      <EnvelopeSimple size={12} color={colors.muted} />
                      <AppText variant="caption" numberOfLines={1}>
                        {item.email}
                      </AppText>
                    </View>
                  ) : null}
                </View>
                <AppText variant="caption" style={styles.sub}>
                  Last login: {fmtDate(item.last_login)} · Created: {fmtDate(item.created_at)}
                </AppText>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="No users" subtitle="Create admin or driver accounts to get started." />}
        />
      )}

      <View style={styles.fabRow}>
        <Pressable testID="create-admin-fab" style={[styles.pill, { backgroundColor: colors.brandSecondary }]} onPress={() => router.push("/user-form?role=ADMIN")}>
          <Plus size={16} color={colors.onBrandSecondary} weight="bold" />
          <AppText variant="label" color="onBrandSecondary">
            Admin
          </AppText>
        </Pressable>
        <Pressable testID="create-driver-fab" style={[styles.pill, { backgroundColor: colors.brandPrimary }]} onPress={() => router.push("/user-form?role=DRIVER")}>
          <Plus size={16} color={colors.onBrandPrimary} weight="bold" />
          <AppText variant="label" color="onBrandPrimary">
            Driver
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  chips: { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: spacing.sm },
  list: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  metaRow: { gap: 2, marginTop: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  sub: { marginTop: 4 },
  fabRow: { position: "absolute", right: spacing.xl, bottom: spacing.lg, flexDirection: "row", gap: spacing.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
}));
