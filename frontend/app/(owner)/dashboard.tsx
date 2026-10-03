import { View, ScrollView, ImageBackground, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { UserPlus, SteeringWheel, Plus } from "phosphor-react-native";
import { AppText, StatCard, SectionHeader, Loading, EmptyState } from "@/src/components/ui";
import { makeStyles, spacing, radius, useTheme, fonts, fontSize } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { useAuth } from "@/src/auth";
import { rupiah } from "@/src/format";

const HERO =
  "https://images.unsplash.com/photo-1531591022136-eb8b0da1e6d0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG5hdnklMjBibHVlJTIwYXJjaGl0ZWN0dXJlfGVufDB8fHx8MTc5MTAzODkyNXww&ixlib=rb-4.1.0&q=85";

type Overview = {
  business: Record<string, number>;
  operations: Record<string, number>;
  customers: Record<string, number>;
  financial: Record<string, number>;
};

export default function OwnerDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGet<Overview>(["owner-dashboard"], "/dashboard/owner");

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
      >
        <ImageBackground source={{ uri: HERO }} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <LinearGradient colors={["rgba(6,27,58,0.5)", "#061B3A"]} style={styles.scrim} />
          <AppText variant="caption" style={styles.heroKicker}>
            HR-GO OWNER
          </AppText>
          <AppText variant="title" color="onBrand" style={styles.heroTitle}>
            {user?.full_name}
          </AppText>
          <AppText variant="bodyMedium" color="onBrand" style={styles.heroSub}>
            Business & Operations Overview
          </AppText>
        </ImageBackground>

        <View style={styles.body}>
          {/* Quick actions */}
          <View style={styles.quickRow}>
            <Pressable testID="qa-create-admin" style={styles.quick} onPress={() => router.push("/user-form?role=ADMIN")}>
              <UserPlus size={24} color={colors.onBrandPrimary} weight="bold" />
              <AppText variant="label" color="onBrandPrimary" style={styles.quickText}>
                Create Admin
              </AppText>
            </Pressable>
            <Pressable testID="qa-create-driver" style={styles.quick} onPress={() => router.push("/user-form?role=DRIVER")}>
              <SteeringWheel size={24} color={colors.onBrandPrimary} weight="bold" />
              <AppText variant="label" color="onBrandPrimary" style={styles.quickText}>
                Create Driver
              </AppText>
            </Pressable>
            <Pressable testID="qa-new-trip" style={styles.quick} onPress={() => router.push("/trip-form")}>
              <Plus size={24} color={colors.onBrandPrimary} weight="bold" />
              <AppText variant="label" color="onBrandPrimary" style={styles.quickText}>
                New Trip
              </AppText>
            </Pressable>
          </View>

          {isLoading || !data ? (
            <Loading testID="owner-dashboard-loading" />
          ) : (
            <View>
              <SectionHeader title="Business Overview" />
              <View style={styles.grid}>
                <StatCard label="Total Trips" value={data.business.total_trips} />
                <StatCard label="Completed" value={data.business.completed_trips} kind="success" />
                <StatCard label="Active Trips" value={data.business.active_trips} kind="warning" />
                <StatCard label="Cancelled" value={data.business.cancelled_trips} kind="error" />
                <StatCard label="Total Revenue" value={rupiah(data.business.total_revenue)} kind="success" />
                <StatCard label="Paid Invoices" value={data.business.paid_invoices} kind="success" />
                <StatCard label="Outstanding Inv." value={data.business.outstanding_invoices} kind="error" />
              </View>

              <SectionHeader title="Operations" />
              <View style={styles.grid}>
                <StatCard label="Today's Trips" value={data.operations.todays_trips} />
                <StatCard label="Active Drivers" value={data.operations.active_drivers} kind="success" />
                <StatCard label="Available Drivers" value={data.operations.available_drivers} />
                <StatCard label="Drivers On Trip" value={data.operations.drivers_on_trip} kind="warning" />
                <StatCard label="Available Vehicles" value={data.operations.available_vehicles} />
                <StatCard label="Vehicles On Trip" value={data.operations.vehicles_on_trip} kind="warning" />
                <StatCard label="In Maintenance" value={data.operations.vehicles_in_maintenance} kind="error" />
              </View>

              <SectionHeader title="Customers" />
              <View style={styles.grid}>
                <StatCard label="Total Customers" value={data.customers.total_customers} />
                <StatCard label="Active" value={data.customers.active_customers} kind="success" />
                <StatCard label="Monthly Contract" value={data.customers.monthly_contract_customers} />
              </View>

              <SectionHeader title="Financial" />
              <View style={styles.grid}>
                <StatCard label="Today's Revenue" value={rupiah(data.financial.todays_revenue)} kind="success" />
                <StatCard label="This Week" value={rupiah(data.financial.this_week)} />
                <StatCard label="This Month" value={rupiah(data.financial.this_month)} />
                <StatCard label="Outstanding" value={rupiah(data.financial.outstanding_payments)} kind="error" />
              </View>

              <SectionHeader title="Manage" />
              <View style={styles.navGrid}>
                {[
                  { label: "Manage Users", to: "/(owner)/users" },
                  { label: "Active Operations", to: "/(owner)/operations" },
                  { label: "Invoices", to: "/invoices-list" },
                  { label: "Reports", to: "/reports" },
                  { label: "Customers", to: "/customers" },
                  { label: "Settings", to: "/settings" },
                ].map((t) => (
                  <Pressable key={t.label} testID={`nav-${t.label}`} style={styles.navTile} onPress={() => router.push(t.to as any)}>
                    <AppText variant="bodyMedium">{t.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  hero: { minHeight: 200, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, justifyContent: "flex-end" },
  scrim: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  heroKicker: { color: colors.brandSecondary, letterSpacing: 2, fontFamily: fonts.bodySemibold },
  heroTitle: { marginTop: spacing.xs },
  heroSub: { opacity: 0.9 },
  body: { padding: spacing.xl, marginTop: -spacing.lg },
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quick: {
    flex: 1,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  quickText: { color: colors.onBrandPrimary, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  navGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  navTile: {
    flexGrow: 1,
    minWidth: "47%",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
}));
