import { useState, useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Badge, Button, InfoRow, SectionHeader, Loading } from "@/src/components/ui";
import { Select, Option } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { confirmDelete } from "@/src/utils/confirm";
import { useAuth } from "@/src/auth";
import { spacing, makeStyles } from "@/src/theme";
import { rupiah, fmtDateTime, tripStatusKind, tripStatusLabel } from "@/src/format";

type Driver = { id: string; full_name: string; driver_id?: string };
type Vehicle = { id: string; name: string; plate: string; status: string };

const STATUS_FLOW: Option[] = [
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "ON_THE_WAY", label: "On the way" },
  { value: "ARRIVED", label: "Arrived" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
];

export default function TripDetail() {
  const styles = useStyles();
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { data: trip, isLoading, refetch } = useGet<any>(["trip", params.id], `/trips/${params.id}`);
  const { data: drivers } = useGet<Driver[]>(["drivers"], "/drivers");
  const { data: vehicles } = useGet<Vehicle[]>(["vehicles"], "/vehicles");

  const [driverId, setDriverId] = useState<string | undefined>();
  const [vehicleId, setVehicleId] = useState<string | undefined>();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (trip) {
      setDriverId(trip.driver_id || undefined);
      setVehicleId(trip.vehicle_id || undefined);
    }
  }, [trip]);

  if (isLoading || !trip) return <StackScreen title="Trip" roles={["OWNER", "ADMIN"]}><Loading /></StackScreen>;

  const refresh = () => {
    invalidate([["trips"], ["trip", params.id], ["owner-dashboard"], ["admin-dashboard"]]);
    refetch();
  };

  const doAssign = async () => {
    try {
      await api.post(`/trips/${params.id}/assign`, { driver_id: driverId, vehicle_id: vehicleId });
      toast.show("Assignment updated", "success");
      refresh();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const setStatus = async (status: string) => {
    try {
      await api.post(`/trips/${params.id}/status`, { status });
      toast.show(`Status → ${tripStatusLabel(status)}`, "success");
      refresh();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const cancel = async () => {
    try {
      await api.post(`/trips/${params.id}/cancel`, { status: "CANCELLED", reason });
      toast.show("Trip cancelled", "success");
      refresh();
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const onDelete = async () => {
    const ok = await confirmDelete(`Permanently delete trip ${trip.trip_number}? This cannot be undone.`);
    if (!ok) return;
    try {
      await api.del(`/trips/${params.id}`);
      toast.show("Trip deleted", "success");
      invalidate([["trips"], ["owner-dashboard"], ["admin-dashboard"]]);
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const drvOpts: Option[] = (drivers || []).map((d) => ({ value: d.id, label: d.full_name, sublabel: d.driver_id }));
  const vehOpts: Option[] = (vehicles || []).map((v) => ({ value: v.id, label: v.name, sublabel: `${v.plate} · ${v.status}` }));

  return (
    <StackScreen
      title={trip.trip_number}
      subtitle={trip.created_by_role === "ADMIN" ? `Created by Admin · ${trip.created_by_name || ""}` : "Trip detail"}
      roles={["OWNER", "ADMIN"]}
      right={<Badge label={tripStatusLabel(trip.status)} kind={tripStatusKind(trip.status)} />}
      footer={
        <View style={styles.footerRow}>
          <Button title="Edit" variant="outline" style={{ flex: 1 }} onPress={() => router.push(`/trip-form?id=${trip.id}`)} testID="edit-trip" />
          <Button title="Invoice" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/invoice-create?customer=${trip.customer_id}&trip=${trip.id}`)} testID="trip-invoice" />
        </View>
      }
    >
      <SectionHeader title="Customer" />
      <Card>
        <InfoRow label="Customer" value={trip.customer_name} />
        <InfoRow label="Passenger" value={trip.passenger_name} />
        <InfoRow label="Phone" value={trip.passenger_phone} />
        <InfoRow label="WhatsApp" value={trip.passenger_whatsapp} />
      </Card>

      <SectionHeader title="Route" />
      <Card>
        <InfoRow label="Pickup" value={trip.pickup_address} />
        <InfoRow label="Meeting Point" value={trip.pickup_meeting_point} />
        <InfoRow label="Destination" value={trip.destination_address} />
        <InfoRow label="Additional Stop" value={trip.additional_stop} />
        <InfoRow label="Pickup Time" value={fmtDateTime(trip.pickup_time)} />
        <InfoRow label="Flight" value={trip.flight_number} />
        <InfoRow label="Terminal" value={trip.terminal} />
        <InfoRow label="Instructions" value={trip.special_instructions} />
      </Card>

      <SectionHeader title="Assignment" />
      <Card style={{ gap: spacing.md }}>
        <Select label="Driver" value={driverId} options={drvOpts} onChange={setDriverId} testID="assign-driver" />
        <Select label="Vehicle" value={vehicleId} options={vehOpts} onChange={setVehicleId} testID="assign-vehicle" />
        <Button title="Save Assignment" small onPress={doAssign} testID="save-assignment" />
      </Card>

      <SectionHeader title="Pricing" />
      <Card>
        <InfoRow label="Base Price" value={rupiah(trip.price)} />
        <InfoRow label="Discount" value={rupiah(trip.discount)} />
        <InfoRow label="Additional" value={rupiah(trip.additional_charges)} />
        <InfoRow label="Total" value={rupiah(trip.total)} valueColor="success" />
      </Card>

      <SectionHeader title="Update Status" />
      <Select label="Trip Status" value={trip.status} options={STATUS_FLOW} onChange={setStatus} testID="set-status" />

      <SectionHeader title="Timeline" />
      <Card>
        {(trip.timeline || []).map((e: any, i: number) => (
          <View key={i} style={styles.timelineRow}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{e.event}</AppText>
              <AppText variant="caption">
                {fmtDateTime(e.at)} · {e.by}
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      {trip.status !== "CANCELLED" && trip.status !== "COMPLETED" ? (
        <Card style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Cancel Trip" />
          <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
            Cancelling logs the action. Provide a reason.
          </AppText>
          <View style={{ gap: spacing.sm }}>
            <Button title="Cancel This Trip" variant="danger" small onPress={cancel} testID="cancel-trip" />
          </View>
        </Card>
      ) : null}

      {isOwner ? (
        <Card style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Danger Zone" />
          <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
            Deleting removes this trip permanently. Owner only.
          </AppText>
          <Button title="Delete Trip" variant="danger" small onPress={onDelete} testID="delete-trip" />
        </Card>
      ) : null}
    </StackScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  footerRow: { flexDirection: "row", gap: spacing.sm },
  timelineRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm, alignItems: "flex-start" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandPrimary, marginTop: 6 },
}));
