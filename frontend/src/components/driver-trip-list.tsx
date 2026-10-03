import { View, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, FlagCheckered, CaretRight } from "phosphor-react-native";
import { AppText, Badge, Loading, EmptyState } from "@/src/components/ui";
import { makeStyles, spacing, radius, useTheme } from "@/src/theme";
import { useGet } from "@/src/hooks";
import type { Trip } from "@/src/components/trips-view";
import { fmtDateTime, tripStatusKind, tripStatusLabel } from "@/src/format";

const UPCOMING = ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"];

export function DriverTripList({ mode }: { mode: "upcoming" | "history" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useGet<Trip[]>(["driver-trips"], "/driver/trips");

  const list = (data || []).filter((t) =>
    mode === "upcoming" ? UPCOMING.includes(t.status) : ["COMPLETED", "CANCELLED"].includes(t.status),
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <AppText variant="title">{mode === "upcoming" ? "My Trips" : "Trip History"}</AppText>
        <AppText variant="caption">
          {mode === "upcoming" ? "Your assigned & active trips" : "Completed & past trips"}
        </AppText>
      </View>
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} testID={`driver-trip-${item.id}`} onPress={() => router.push(`/driver-trip/${item.id}`)}>
              <View style={styles.cardTop}>
                <AppText variant="label">{item.trip_number}</AppText>
                <Badge label={tripStatusLabel(item.status)} kind={tripStatusKind(item.status)} />
              </View>
              <AppText variant="heading" numberOfLines={1}>
                {item.passenger_name || item.customer_name}
              </AppText>
              <View style={styles.routeRow}>
                <MapPin size={14} color={colors.success} weight="fill" />
                <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                  {item.pickup_address}
                </AppText>
              </View>
              <View style={styles.routeRow}>
                <FlagCheckered size={14} color={colors.error} weight="fill" />
                <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                  {item.destination_address}
                </AppText>
              </View>
              <View style={styles.cardBottom}>
                <AppText variant="caption">{fmtDateTime(item.pickup_time)}</AppText>
                <CaretRight size={16} color={colors.muted} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              title={mode === "upcoming" ? "No assigned trips" : "No past trips"}
              subtitle={mode === "upcoming" ? "You are off duty. Enjoy your rest." : "Completed trips will show here."}
            />
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing["3xl"] },
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
}));
