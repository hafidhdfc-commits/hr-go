import { useState, useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StackScreen } from "@/src/components/stack-screen";
import { Field, Button, SectionHeader } from "@/src/components/ui";
import { Select, Option } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { spacing } from "@/src/theme";
import type { Trip } from "@/src/components/trips-view";

type Customer = { id: string; name: string; company?: string; phone?: string; whatsapp?: string };
type Driver = { id: string; full_name: string; driver_id?: string };
type Vehicle = { id: string; name: string; plate: string; status: string };

export default function TripForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();
  const editing = !!params.id;

  const { data: customers } = useGet<Customer[]>(["customers"], "/customers");
  const { data: drivers } = useGet<Driver[]>(["drivers"], "/drivers");
  const { data: vehicles } = useGet<Vehicle[]>(["vehicles"], "/vehicles");
  const { data: existing } = useGet<Trip & any>(["trip", params.id], `/trips/${params.id}`, editing);

  const [f, setF] = useState<any>({ price: "0" });
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existing) setF({ ...existing, price: String(existing.price ?? 0) });
  }, [existing]);

  const set = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }));

  const custOpts: Option[] = (customers || []).map((c) => ({ value: c.id, label: c.name, sublabel: c.company }));
  const drvOpts: Option[] = (drivers || []).map((d) => ({ value: d.id, label: d.full_name, sublabel: d.driver_id }));
  const vehOpts: Option[] = (vehicles || []).map((v) => ({ value: v.id, label: v.name, sublabel: `${v.plate} · ${v.status}` }));

  const pickCustomer = (id: string) => {
    const c = customers?.find((x) => x.id === id);
    setF((p: any) => ({
      ...p,
      customer_id: id,
      customer_name: c?.name,
      passenger_name: p.passenger_name || c?.name,
      passenger_phone: p.passenger_phone || c?.phone,
      passenger_whatsapp: p.passenger_whatsapp || c?.whatsapp,
    }));
  };

  const save = async () => {
    if (!f.pickup_address || !f.destination_address) return toast.show("Pickup & destination required", "error");
    const body: any = {
      customer_id: f.customer_id, customer_name: f.customer_name, passenger_name: f.passenger_name,
      passenger_phone: f.passenger_phone, passenger_whatsapp: f.passenger_whatsapp,
      pickup_address: f.pickup_address, pickup_meeting_point: f.pickup_meeting_point,
      destination_address: f.destination_address, additional_stop: f.additional_stop,
      pickup_time: f.pickup_time, flight_number: f.flight_number, terminal: f.terminal,
      special_instructions: f.special_instructions, driver_id: f.driver_id, vehicle_id: f.vehicle_id,
      price: parseInt(f.price || "0", 10) || 0, discount: 0, additional_charges: 0,
    };
    try {
      setLoading(true);
      if (editing) {
        await api.patch(`/trips/${params.id}`, { ...body, reason });
        toast.show("Trip updated", "success");
      } else {
        await api.post("/trips", body);
        toast.show("Trip created", "success");
      }
      invalidate([["trips"], ["trip", params.id as string], ["owner-dashboard"], ["admin-dashboard"]]);
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StackScreen
      title={editing ? `Edit Trip` : "New Trip"}
      subtitle={editing ? existing?.trip_number : "Create a new transfer"}
      roles={["OWNER", "ADMIN"]}
      footer={<Button title={editing ? "Save Changes" : "Create Trip"} onPress={save} loading={loading} testID="save-trip" />}
    >
      <Select label="Customer" value={f.customer_id} options={custOpts} onChange={pickCustomer} testID="trip-customer" />
      <Field label="Passenger Name" value={f.passenger_name || ""} onChangeText={set("passenger_name")} testID="trip-passenger" />
      <Field label="Passenger Phone" value={f.passenger_phone || ""} onChangeText={set("passenger_phone")} keyboardType="phone-pad" testID="trip-phone" />
      <Field label="WhatsApp Number" value={f.passenger_whatsapp || ""} onChangeText={set("passenger_whatsapp")} keyboardType="phone-pad" testID="trip-whatsapp" />

      <SectionHeader title="Route" />
      <Field label="Pickup Address" value={f.pickup_address || ""} onChangeText={set("pickup_address")} testID="trip-pickup" />
      <Field label="Meeting Point" value={f.pickup_meeting_point || ""} onChangeText={set("pickup_meeting_point")} testID="trip-meeting" />
      <Field label="Destination" value={f.destination_address || ""} onChangeText={set("destination_address")} testID="trip-destination" />
      <Field label="Additional Stop (optional)" value={f.additional_stop || ""} onChangeText={set("additional_stop")} />

      <SectionHeader title="Schedule & Flight" />
      <Field label="Pickup Time (ISO e.g. 2026-10-05T18:30)" value={f.pickup_time || ""} onChangeText={set("pickup_time")} testID="trip-time" />
      <Field label="Flight Number" value={f.flight_number || ""} onChangeText={set("flight_number")} autoCapitalize="none" />
      <Field label="Terminal" value={f.terminal || ""} onChangeText={set("terminal")} />
      <Field label="Special Instructions" value={f.special_instructions || ""} onChangeText={set("special_instructions")} multiline />

      <SectionHeader title="Assignment & Pricing" />
      <Select label="Driver" value={f.driver_id} options={drvOpts} onChange={set("driver_id")} testID="trip-driver" />
      <Select label="Vehicle" value={f.vehicle_id} options={vehOpts} onChange={set("vehicle_id")} testID="trip-vehicle" />
      <Field label="Price (Rp)" value={String(f.price ?? "0")} onChangeText={set("price")} keyboardType="numeric" testID="trip-price" />

      {editing ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Reason for change (override log)" value={reason} onChangeText={setReason} multiline testID="trip-reason" />
        </View>
      ) : null}
    </StackScreen>
  );
}
