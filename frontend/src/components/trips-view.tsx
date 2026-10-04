import { View, FlatList, Pressable, RefreshControl } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, FlagCheckered, Plus } from "phosphor-react-native";
import { AppText, Badge, Loading, EmptyState, ChipRow } from "@/src/components/ui";
import { makeStyles, spacing, radius, useTheme, fonts } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { rupiah, fmtDateTime, tripStatusKind, tripStatusLabel } from "@/src/format";

export type Trip = {
  id: string;
  trip_number: string;
  customer_name?: string;
  passenger_name?: string;
  pickup_address: string;
  destination_address: string;
  pickup_time?: string;
  status: string;
  driver_name?: string;
  vehicle_name?: string;
  vehicle_plate?: string;
  price: number;
  total: number;
  created_by_role?: string;
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "UNASSIGNED", label: "Unassigned" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const ACTIVE_SET = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={styles.card} onPress={onPress} testID={`trip-${trip.id}`}>
      <View style={styles.cardTop}>
        <AppText variant="label" style={styles.tripNo}>
          {trip.trip_number}
        </AppText>
        <Badge label={tripStatusLabel(trip.status)} kind={tripStatusKind(trip.status)} />
      </View>
      <AppText variant="heading" numberOfLines={1} style={styles.customer}>
        {trip.customer_name || trip.passenger_name || "—"}
      </AppText>
      <View style={styles.routeRow}>
        <MapPin size={14} color={colors.success} weight="fill" />
        <AppText variant="caption" numberOfLines={1} style={styles.routeText}>
          {trip.pickup_address}
        </AppText>
      </View>
      <View style={styles.routeRow}>
        <FlagCheckered size={14} color={colors.error} weight="fill" />
        <AppText variant="caption" numberOfLines={1} style={styles.routeText}>
          {trip.destination_address}
        </AppText>
      </View>
      <View style={styles.cardBottom}>
        <AppText variant="caption">{fmtDateTime(trip.pickup_time)}</AppText>
        <AppText variant="bodyMedium">{rupiah(trip.total)}</AppText>
      </View>
      <View style={styles.assignRow}>
        <AppText variant="caption" color={trip.driver_name ? "success" : "warning"}>
          {trip.driver_name ? `Driver: ${trip.driver_name}` : "No driver assigned"}
        </AppText>
        {trip.vehicle_name ? <AppText variant="caption">· {trip.vehicle_name}</AppText> : null}
      </View>
    </Pressable>
  );
}

export function TripsView({ title, subtitle }: { title: string; subtitle: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const { data, isLoading, refetch, isRefetching } = useGet<Trip[]>(["trips"], "/trips");

  const filtered = (data || []).filter((t) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return ACTIVE_SET.includes(t.status);
    return t.status === filter;
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="caption">{subtitle}</AppText>
      </View>
      <View style={styles.chips}>
        <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
      </View>
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => <TripCard trip={item} onPress={() => router.push(`/trip/${item.id}`)} />}
          ListEmptyComponent={<EmptyState title="No trips here" subtitle="Trips will appear as they are created." />}
        />
      )}
      <Pressable
        testID="fab-new-trip"
        style={[styles.fab, { bottom: spacing.lg }]}
        onPress={() => router.push("/trip-form")}
      >
        <Plus size={26} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  chips: { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: spacing.sm },
  list: { padding: spacing.xl, paddingTop: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tripNo: { letterSpacing: 0.5 },
  customer: { marginTop: 2 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  routeText: { flex: 1 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  assignRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  fab: {
    position: "absolute",
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
}));
