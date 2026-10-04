import { useState } from "react";
import { View, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckSquare, Square } from "phosphor-react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Button, Field, SectionHeader, ChipRow, Badge } from "@/src/components/ui";
import { Select, Option } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { spacing, makeStyles, useTheme } from "@/src/theme";
import { rupiah, fmtDateTime } from "@/src/format";
import type { Trip } from "@/src/components/trips-view";

type Customer = { id: string; name: string; company?: string };

export default function InvoiceCreate() {
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ customer?: string; trip?: string }>();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();

  const [kind, setKind] = useState("DAILY");
  const [customerId, setCustomerId] = useState<string | undefined>(params.customer);
  const [selected, setSelected] = useState<string[]>(params.trip ? [params.trip] : []);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: customers } = useGet<Customer[]>(["customers"], "/customers");
  const { data: trips } = useGet<Trip[]>(["trips"], "/trips");

  const custOpts: Option[] = (customers || []).map((c) => ({ value: c.id, label: c.name, sublabel: c.company }));
  const custTrips = (trips || []).filter((t) => t.id && customerId && (t as any).customer_id === customerId);

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const generate = async () => {
    if (!customerId) return toast.show("Select a customer", "error");
    try {
      setLoading(true);
      let inv: any;
      if (kind === "DAILY") {
        if (selected.length === 0) return toast.show("Select at least one trip", "error");
        inv = await api.post("/invoices/daily", { customer_id: customerId, trip_ids: selected });
      } else {
        if (!periodStart || !periodEnd) return toast.show("Enter period dates", "error");
        inv = await api.post("/invoices/monthly", { customer_id: customerId, period_start: periodStart, period_end: periodEnd, period_label: periodLabel });
      }
      invalidate([["invoices"]]);
      toast.show("Invoice generated", "success");
      router.replace(`/invoice/${inv.id}`);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StackScreen
      title="Generate Invoice"
      subtitle="Daily or monthly billing"
      roles={["OWNER", "ADMIN"]}
      footer={<Button title="Generate Invoice" onPress={generate} loading={loading} testID="generate-invoice" />}
    >
      <ChipRow
        options={[
          { key: "DAILY", label: "Daily Invoice" },
          { key: "MONTHLY", label: "Monthly Invoice" },
        ]}
        value={kind}
        onChange={setKind}
      />
      <View style={{ height: spacing.sm }} />
      <Select label="Customer" value={customerId} options={custOpts} onChange={setCustomerId} testID="invoice-customer" />

      {kind === "DAILY" ? (
        <>
          <SectionHeader title="Select Trips" />
          {customerId ? (
            custTrips.length ? (
              custTrips.map((t: any) => {
                const on = selected.includes(t.id);
                return (
                  <Pressable key={t.id} style={styles.tripRow} onPress={() => toggle(t.id)} testID={`select-trip-${t.id}`}>
                    {on ? <CheckSquare size={22} color={colors.brandPrimary} weight="fill" /> : <Square size={22} color={colors.muted} />}
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyMedium">{t.trip_number}</AppText>
                      <AppText variant="caption" numberOfLines={1}>
                        {t.pickup_address} → {t.destination_address}
                      </AppText>
                      <AppText variant="caption">{fmtDateTime(t.pickup_time)}</AppText>
                    </View>
                    <AppText variant="bodyMedium">{rupiah(t.total)}</AppText>
                  </Pressable>
                );
              })
            ) : (
              <AppText variant="caption">No trips for this customer.</AppText>
            )
          ) : (
            <AppText variant="caption">Select a customer to see trips.</AppText>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Billing Period" />
          <Field label="Period Start (YYYY-MM-DD)" value={periodStart} onChangeText={setPeriodStart} testID="period-start" />
          <Field label="Period End (YYYY-MM-DD)" value={periodEnd} onChangeText={setPeriodEnd} testID="period-end" />
          <Field label="Period Label (e.g. September 2026)" value={periodLabel} onChangeText={setPeriodLabel} testID="period-label" />
          <Card style={{ marginTop: spacing.sm }}>
            <AppText variant="caption">
              All of the customer's trips within the period are consolidated automatically into one invoice.
            </AppText>
          </Card>
        </>
      )}
    </StackScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
}));
