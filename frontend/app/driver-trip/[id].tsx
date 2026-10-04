import { useState } from "react";
import { View, Modal, Pressable, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Phone, WhatsappLogo, NavigationArrow, MapPin, FlagCheckered, X } from "phosphor-react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Badge, Button, InfoRow, SectionHeader, Loading } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { spacing, radius, makeStyles, useTheme } from "@/src/theme";
import { fmtDateTime, fmtTime, tripStatusKind, tripStatusLabel, openDialer, openWhatsApp, openNavigation } from "@/src/format";

type WaData = { message: string; phone: string; templates: Record<string, string> };

const TEMPLATE_LABELS: Record<string, string> = {
  default: "Izin meluncur (default)",
  on_the_way: "On the way",
  arrived: "Arrived",
  waiting: "Waiting",
  completed: "Completed",
};

const NEXT_ACTIONS: { status: string; label: string; from: string[] }[] = [
  { status: "ON_THE_WAY", label: "On The Way", from: ["ACCEPTED"] },
  { status: "ARRIVED", label: "Arrived", from: ["ON_THE_WAY"] },
  { status: "IN_PROGRESS", label: "Passenger Picked Up · Start", from: ["ARRIVED"] },
  { status: "COMPLETED", label: "Complete Trip", from: ["IN_PROGRESS"] },
];

export default function DriverTripDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const invalidate = useInvalidate();
  const { data: trip, isLoading, refetch } = useGet<any>(["driver-trip", params.id], `/trips/${params.id}`);
  const { data: wa } = useGet<WaData>(["wa", params.id], `/driver/trips/${params.id}/whatsapp`, !!trip?.driver_id);
  const [waOpen, setWaOpen] = useState(false);

  if (isLoading || !trip) return <StackScreen title="Trip" roles={["DRIVER"]}><Loading /></StackScreen>;

  const refresh = () => {
    invalidate([["driver-trips"], ["driver-trip", params.id], ["driver-dashboard"]]);
    refetch();
  };

  const logContact = async (action: string) => {
    try {
      await api.post(`/driver/trips/${params.id}/contact-log`, { action });
      refresh();
    } catch {}
  };

  const call = async () => {
    if (!trip.passenger_phone) return toast.show("No phone number", "error");
    await logContact("Customer Called");
    openDialer(trip.passenger_phone);
  };

  const sendWa = async (templateKey: string) => {
    if (!wa?.phone) return toast.show("No WhatsApp number", "error");
    const msg = wa.templates[templateKey] || wa.message;
    setWaOpen(false);
    await logContact("Opened customer WhatsApp");
    openWhatsApp(wa.phone, msg);
  };

  const changeStatus = async (status: string) => {
    try {
      await api.post(`/trips/${params.id}/status`, { status });
      toast.show(`Status → ${tripStatusLabel(status)}`, "success");
      refresh();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const accept = async () => {
    await api.post(`/driver/trips/${params.id}/accept`);
    toast.show("Trip accepted", "success");
    refresh();
  };
  const decline = async () => {
    await api.post(`/driver/trips/${params.id}/decline`, { reason: "Declined by driver" });
    toast.show("Trip declined", "info");
    refresh();
  };

  const nextAction = NEXT_ACTIONS.find((a) => a.from.includes(trip.status));

  return (
    <StackScreen
      title={trip.trip_number}
      subtitle="Assigned trip"
      roles={["DRIVER"]}
      right={<Badge label={tripStatusLabel(trip.status)} kind={tripStatusKind(trip.status)} />}
      footer={
        <View style={{ gap: spacing.sm }}>
          {trip.status === "ASSIGNED" ? (
            <View style={styles.row}>
              <Button title="Decline" variant="outline" style={{ flex: 1 }} onPress={decline} testID="decline-trip" />
              <Button title="Accept Trip" variant="primary" style={{ flex: 2 }} onPress={accept} testID="accept-trip" />
            </View>
          ) : nextAction ? (
            <Button title={nextAction.label} variant={nextAction.status === "COMPLETED" ? "success" : "primary"} onPress={() => changeStatus(nextAction.status)} testID="next-status" />
          ) : (
            <AppText variant="caption" style={{ textAlign: "center" }}>
              {trip.status === "COMPLETED" ? "Trip completed. Thank you!" : "No further action."}
            </AppText>
          )}
        </View>
      }
    >
      {/* Customer contact card */}
      <SectionHeader title="Customer" />
      <Card style={styles.contactCard}>
        <AppText variant="heading">{trip.customer_name}</AppText>
        {trip.passenger_name && trip.passenger_name !== trip.customer_name ? (
          <AppText variant="caption">Passenger: {trip.passenger_name}</AppText>
        ) : null}
        <AppText variant="bodyMedium" style={{ marginTop: 4 }}>
          {trip.passenger_phone || "-"}
        </AppText>
        <AppText variant="caption">Pickup: {fmtTime(trip.pickup_time)}</AppText>
        <View style={styles.contactBtns}>
          <Button title="CALL" variant="primary" icon={<Phone size={18} color={colors.onBrandPrimary} weight="fill" />} style={{ flex: 1 }} onPress={call} testID="call-customer" />
          <Button title="WHATSAPP" variant="whatsapp" icon={<WhatsappLogo size={18} color={colors.onWhatsapp} weight="fill" />} style={{ flex: 1 }} onPress={() => setWaOpen(true)} testID="whatsapp-customer" />
        </View>
      </Card>

      {/* Pickup */}
      <SectionHeader title="Pickup" />
      <Card>
        <View style={styles.navRow}>
          <MapPin size={18} color={colors.success} weight="fill" />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">{trip.pickup_address}</AppText>
            {trip.pickup_meeting_point ? <AppText variant="caption">Meeting Point: {trip.pickup_meeting_point}</AppText> : null}
            {trip.terminal ? <AppText variant="caption">{trip.terminal}</AppText> : null}
          </View>
        </View>
        <Button title="NAVIGATE" variant="outline" small icon={<NavigationArrow size={16} color={colors.brandPrimary} weight="fill" />} style={{ marginTop: spacing.sm }} onPress={() => openNavigation(trip.pickup_address)} testID="navigate-pickup" />
      </Card>

      {/* Destination */}
      <SectionHeader title="Destination" />
      <Card>
        <View style={styles.navRow}>
          <FlagCheckered size={18} color={colors.error} weight="fill" />
          <AppText variant="bodyMedium" style={{ flex: 1 }}>
            {trip.destination_address}
          </AppText>
        </View>
        <Button title="NAVIGATE" variant="outline" small icon={<NavigationArrow size={16} color={colors.brandPrimary} weight="fill" />} style={{ marginTop: spacing.sm }} onPress={() => openNavigation(trip.destination_address)} testID="navigate-destination" />
      </Card>

      {trip.special_instructions ? (
        <>
          <SectionHeader title="Instructions" />
          <Card>
            <AppText variant="body">{trip.special_instructions}</AppText>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Trip Details" />
      <Card>
        <InfoRow label="Flight" value={trip.flight_number} />
        <InfoRow label="Vehicle" value={trip.vehicle_name ? `${trip.vehicle_name} · ${trip.vehicle_plate || ""}` : "-"} />
        <InfoRow label="Pickup Time" value={fmtDateTime(trip.pickup_time)} />
      </Card>

      <SectionHeader title="Timeline" />
      <Card>
        {(trip.timeline || []).map((e: any, i: number) => (
          <View key={i} style={styles.timelineRow}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{tripStatusLabel(e.event)}</AppText>
              <AppText variant="caption">{fmtDateTime(e.at)}</AppText>
            </View>
          </View>
        ))}
      </Card>

      {/* WhatsApp template picker */}
      <Modal visible={waOpen} transparent animationType="slide" onRequestClose={() => setWaOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setWaOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <AppText variant="heading">Quick Message</AppText>
              <Pressable onPress={() => setWaOpen(false)} hitSlop={10} testID="close-wa">
                <X size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
              Pick a template. WhatsApp opens pre-filled — you review & send manually.
            </AppText>
            <ScrollView style={{ maxHeight: 380 }}>
              {wa
                ? Object.keys(wa.templates).map((k) => (
                    <Pressable key={k} testID={`wa-template-${k}`} style={styles.tplItem} onPress={() => sendWa(k)}>
                      <AppText variant="bodyMedium">{TEMPLATE_LABELS[k] || k}</AppText>
                      <AppText variant="caption" numberOfLines={3}>
                        {wa.templates[k]}
                      </AppText>
                    </Pressable>
                  ))
                : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </StackScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", gap: spacing.sm },
  contactCard: { gap: 2 },
  contactBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  navRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  timelineRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm, alignItems: "flex-start" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandPrimary, marginTop: 6 },
  backdrop: { flex: 1, backgroundColor: "rgba(6,27,58,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"] },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  tplItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 2 },
}));
