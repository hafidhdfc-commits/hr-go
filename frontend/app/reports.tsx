import { View } from "react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { StatCard, SectionHeader, Loading, Card, InfoRow } from "@/src/components/ui";
import { makeStyles, spacing } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { useAuth } from "@/src/auth";
import { rupiah } from "@/src/format";
import type { Invoice } from "@/src/components/invoices-view";

export default function Reports() {
  const styles = useStyles();
  const { user } = useAuth();
  const path = user?.role === "OWNER" ? "/dashboard/owner" : "/dashboard/admin";
  const { data } = useGet<any>(["report-overview", path], path);
  const { data: invoices } = useGet<Invoice[]>(["invoices"], "/invoices");

  if (!data) return <StackScreen title="Reports" roles={["OWNER", "ADMIN"]}><Loading /></StackScreen>;

  const paid = (invoices || []).filter((i) => i.payment_status === "PAID");
  const outstanding = (invoices || []).filter((i) => i.payment_status !== "PAID");
  const paidTotal = paid.reduce((s, i) => s + i.total, 0);
  const outstandingTotal = outstanding.reduce((s, i) => s + i.total, 0);

  return (
    <StackScreen title="Reports" subtitle="Business performance" roles={["OWNER", "ADMIN"]}>
      <SectionHeader title="Trips" />
      <View style={styles.grid}>
        <StatCard label="Total" value={data.business.total_trips} />
        <StatCard label="Completed" value={data.business.completed_trips} kind="success" />
        <StatCard label="Active" value={data.business.active_trips} kind="warning" />
        <StatCard label="Cancelled" value={data.business.cancelled_trips} kind="error" />
      </View>

      {data.financial ? (
        <>
          <SectionHeader title="Revenue" />
          <View style={styles.grid}>
            <StatCard label="Today" value={rupiah(data.financial.todays_revenue)} kind="success" />
            <StatCard label="This Week" value={rupiah(data.financial.this_week)} />
            <StatCard label="This Month" value={rupiah(data.financial.this_month)} />
          </View>
        </>
      ) : null}

      <SectionHeader title="Billing Summary" />
      <Card>
        <InfoRow label="Paid Invoices" value={`${paid.length}`} />
        <InfoRow label="Paid Amount" value={rupiah(paidTotal)} valueColor="success" />
        <InfoRow label="Outstanding Invoices" value={`${outstanding.length}`} />
        <InfoRow label="Outstanding Amount" value={rupiah(outstandingTotal)} valueColor="error" />
      </Card>

      <SectionHeader title="Customers" />
      <View style={styles.grid}>
        <StatCard label="Total" value={data.customers.total_customers} />
        <StatCard label="Active" value={data.customers.active_customers} kind="success" />
        <StatCard label="Monthly" value={data.customers.monthly_contract_customers} />
      </View>
    </StackScreen>
  );
}

const useStyles = makeStyles(() => ({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
}));
