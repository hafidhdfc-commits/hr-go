import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "phosphor-react-native";
import { TabScreen } from "@/src/components/screen";
import { AppText, StatCard, SectionHeader, Loading } from "@/src/components/ui";
import { makeStyles, spacing, radius, useTheme } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { useAuth } from "@/src/auth";
import { rupiah } from "@/src/format";

type Overview = {
  business: Record<string, number>;
  operations: Record<string, number>;
  customers: Record<string, number>;
  financial: Record<string, number>;
};

export default function AdminDashboard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGet<Overview>(["admin-dashboard"], "/dashboard/admin");

  return (
    <TabScreen
      title="HR-Go Admin"
      subtitle="Operations Dashboard"
      onRefresh={refetch}
      refreshing={isRefetching}
      testID="admin-dashboard"
    >
      <View style={styles.quickRow}>
        <Pressable testID="admin-new-trip" style={styles.quick} onPress={() => router.push("/trip-form")}>
          <Plus size={20} color={colors.onBrandPrimary} weight="bold" />
          <AppText variant="bodyMedium" color="onBrandPrimary">
            New Trip
          </AppText>
        </Pressable>
        <Pressable testID="admin-new-invoice" style={[styles.quick, styles.quickAlt]} onPress={() => router.push("/invoice-create")}>
          <AppText variant="bodyMedium" color="onBrandSecondary">
            Generate Invoice
          </AppText>
        </Pressable>
      </View>

      {isLoading || !data ? (
        <Loading />
      ) : (
        <View>
          <SectionHeader title="Business Overview" />
          <View style={styles.grid}>
            <StatCard label="Total Trips" value={data.business.total_trips} />
            <StatCard label="Completed" value={data.business.completed_trips} kind="success" />
            <StatCard label="Active" value={data.business.active_trips} kind="warning" />
            <StatCard label="Cancelled" value={data.business.cancelled_trips} kind="error" />
          </View>

          <SectionHeader title="Operations" />
          <View style={styles.grid}>
            <StatCard label="Today's Trips" value={data.operations.todays_trips} />
            <StatCard label="Available Drivers" value={data.operations.available_drivers} kind="success" />
            <StatCard label="Drivers On Trip" value={data.operations.drivers_on_trip} kind="warning" />
            <StatCard label="Available Vehicles" value={data.operations.available_vehicles} />
            <StatCard label="Vehicles On Trip" value={data.operations.vehicles_on_trip} kind="warning" />
            <StatCard label="In Maintenance" value={data.operations.vehicles_in_maintenance} kind="error" />
          </View>

          <SectionHeader title="Customers" />
          <View style={styles.grid}>
            <StatCard label="Total" value={data.customers.total_customers} />
            <StatCard label="Active" value={data.customers.active_customers} kind="success" />
            <StatCard label="Monthly Contract" value={data.customers.monthly_contract_customers} />
          </View>

          {data.financial ? (
            <>
              <SectionHeader title="Financial" />
              <View style={styles.grid}>
                <StatCard label="Today's Revenue" value={rupiah(data.financial.todays_revenue)} kind="success" />
                <StatCard label="This Month" value={rupiah(data.financial.this_month)} />
                <StatCard label="Outstanding" value={rupiah(data.financial.outstanding_payments)} kind="error" />
              </View>
            </>
          ) : null}
        </View>
      )}
    </TabScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  quickRow: { flexDirection: "row", gap: spacing.sm },
  quick: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  quickAlt: { backgroundColor: colors.brandSecondary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
}));
