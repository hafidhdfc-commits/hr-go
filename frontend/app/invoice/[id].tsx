import { useState } from "react";
import { View, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { FilePdf, Eye, WhatsappLogo } from "phosphor-react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Badge, Button, InfoRow, SectionHeader, Loading } from "@/src/components/ui";
import { Select } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError, pdfUrl } from "@/src/api";
import { storage } from "@/src/utils/storage";
import { TOKEN_KEY } from "@/src/api";
import { spacing, makeStyles, useTheme } from "@/src/theme";
import { rupiah, fmtDate, fmtDateTime, invoiceStatusKind, openWhatsApp } from "@/src/format";
import { useAuth } from "@/src/auth";

const PAY_OPTS = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
];

export default function InvoiceDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const invalidate = useInvalidate();
  const { data: inv, isLoading, refetch } = useGet<any>(["invoice", params.id], `/invoices/${params.id}`);
  const [sending, setSending] = useState(false);

  if (isLoading || !inv) return <StackScreen title="Invoice" roles={["OWNER", "ADMIN"]}><Loading /></StackScreen>;

  const refresh = () => {
    invalidate([["invoices"], ["invoice", params.id]]);
    refetch();
  };

  const setPayment = async (payment_status: string) => {
    try {
      await api.patch(`/invoices/${params.id}`, { payment_status });
      toast.show(`Marked ${payment_status}`, "success");
      refresh();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const openPdf = async () => {
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    const url = `${pdfUrl(inv.id)}?token=${token}`;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Linking.openURL(url);
    }
  };

  const sendWhatsApp = async () => {
    try {
      setSending(true);
      const res = await api.post<{ phone: string; message: string }>(`/invoices/${params.id}/whatsapp`, {});
      if (!res.phone) {
        toast.show("Customer has no WhatsApp number", "error");
        return;
      }
      refresh();
      await openWhatsApp(res.phone, res.message);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <StackScreen
      title={inv.invoice_number}
      subtitle={`${inv.kind} invoice`}
      roles={["OWNER", "ADMIN"]}
      right={<Badge label={inv.payment_status} kind={invoiceStatusKind(inv.payment_status)} />}
      footer={
        <View style={styles.footerRow}>
          <Button title="PDF" variant="outline" small style={{ flex: 1 }} icon={<FilePdf size={16} color={colors.brandPrimary} />} onPress={openPdf} testID="download-pdf" />
          <Button title="Preview" variant="secondary" small style={{ flex: 1 }} icon={<Eye size={16} color={colors.onSurfaceTertiary} />} onPress={openPdf} testID="preview-pdf" />
          <Button title="WhatsApp" variant="whatsapp" small style={{ flex: 1.3 }} loading={sending} icon={<WhatsappLogo size={16} color={colors.onWhatsapp} weight="fill" />} onPress={sendWhatsApp} testID="whatsapp-invoice" />
        </View>
      }
    >
      <Card>
        <InfoRow label="Customer" value={inv.customer_name} />
        <InfoRow label="Company" value={inv.customer_company} />
        <InfoRow label="WhatsApp" value={inv.customer_whatsapp} />
        <InfoRow label="Period" value={inv.period_label} />
        <InfoRow label="Due Date" value={inv.due_date} />
        <InfoRow label="Created" value={`${fmtDate(inv.created_at)} · ${inv.created_by}`} />
      </Card>

      <SectionHeader title={`Line Items (${inv.trip_count})`} />
      <Card>
        {(inv.line_items || []).map((li: any, i: number) => (
          <View key={i} style={styles.li}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{li.trip_number}</AppText>
              <AppText variant="caption" numberOfLines={1}>
                {li.description}
              </AppText>
            </View>
            <AppText variant="bodyMedium">{rupiah(li.amount)}</AppText>
          </View>
        ))}
        <View style={styles.totalRow}>
          <AppText variant="heading">Total</AppText>
          <AppText variant="heading" color="success">
            {rupiah(inv.total)}
          </AppText>
        </View>
      </Card>

      <SectionHeader title="Payment" />
      <Select label="Payment Status" value={inv.payment_status} options={PAY_OPTS} onChange={setPayment} testID="payment-status" />

      <SectionHeader title="Send History" />
      <Card>
        {(inv.send_history || []).length ? (
          inv.send_history.map((h: any, i: number) => (
            <View key={i} style={styles.hist}>
              <AppText variant="bodyMedium">{h.status} · {h.method}</AppText>
              <AppText variant="caption">
                {fmtDateTime(h.at)} · {h.sent_by} ({h.role})
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="caption">Not sent yet.</AppText>
        )}
      </Card>
    </StackScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  footerRow: { flexDirection: "row", gap: spacing.sm },
  li: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  hist: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
}));
