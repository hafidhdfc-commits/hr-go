import { useState, useEffect } from "react";
import { View } from "react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { Field, Button, SectionHeader, Card, AppText, Loading } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { spacing, makeStyles, useTheme } from "@/src/theme";

type Template = { id: string; template_name: string; category: string; content: string; variables: string[]; version: number };

const DEFAULT_INVOICE = `Halo Kak [Customer Name],
berikut kami kirimkan invoice HR-Go untuk perjalanan [Invoice Period].

Invoice: [Invoice Number]
Total: [Total Amount]
Periode: [Invoice Period]

Mohon dapat diperiksa ya Kak.
Terima kasih sudah menggunakan HR-Go — The Better Way to Go 🙏`;

const SAMPLE: Record<string, string> = {
  "Customer Name": "Bapak Hafidh",
  "Invoice Number": "INV-2026-0098",
  "Invoice Date": "03 Okt 2026",
  "Invoice Period": "September 2026",
  "Trip Date": "01–30 September 2026",
  "Total Amount": "Rp8.500.000",
  "Due Date": "10 Okt 2026",
  "Company Name": "PT Harmoni Rute Indonesia",
  "Trip Count": "12",
  "Payment Status": "UNPAID",
  "Admin Name": "Andi Pratama",
  "HR-Go": "HR-Go",
  "Driver Name": "Budi Santoso",
  "Pickup Location": "Soekarno-Hatta T3",
  "Destination": "Alam Sutera",
};

function preview(content: string): string {
  let out = content;
  Object.keys(SAMPLE).forEach((k) => (out = out.split(`[${k}]`).join(SAMPLE[k])));
  return out;
}

export default function WhatsAppTemplates() {
  const styles = useStyles();
  const toast = useToast();
  const invalidate = useInvalidate();
  const { data, isLoading } = useGet<Template[]>(["whatsapp-templates"], "/whatsapp-templates");
  const [content, setContent] = useState("");
  const [tpl, setTpl] = useState<Template | null>(null);

  useEffect(() => {
    const invoiceTpl = (data || []).find((t) => t.category === "INVOICE");
    if (invoiceTpl) {
      setTpl(invoiceTpl);
      setContent(invoiceTpl.content);
    }
  }, [data]);

  const save = async () => {
    if (!tpl) return;
    try {
      await api.patch(`/whatsapp-templates/${tpl.id}`, { content });
      invalidate([["whatsapp-templates"]]);
      toast.show("Template saved", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  if (isLoading) return <StackScreen title="WhatsApp Templates" roles={["OWNER", "ADMIN"]}><Loading /></StackScreen>;

  return (
    <StackScreen
      title="WhatsApp Templates"
      subtitle={`Invoice message${tpl ? ` · v${tpl.version}` : ""}`}
      roles={["OWNER", "ADMIN"]}
      footer={
        <View style={styles.footerRow}>
          <Button title="Reset to Default" variant="outline" style={{ flex: 1 }} onPress={() => setContent(DEFAULT_INVOICE)} testID="reset-template" />
          <Button title="Save Template" style={{ flex: 1 }} onPress={save} testID="save-template" />
        </View>
      }
    >
      <SectionHeader title="Invoice Template" />
      <Field label="Message Content" value={content} onChangeText={setContent} multiline testID="template-content" />

      <SectionHeader title="Available Variables" />
      <View style={styles.vars}>
        {Object.keys(SAMPLE).map((v) => (
          <View key={v} style={styles.varChip}>
            <AppText variant="caption">[{v}]</AppText>
          </View>
        ))}
      </View>

      <SectionHeader title="Message Preview" />
      <Card>
        <AppText variant="body" style={styles.preview}>
          {preview(content)}
        </AppText>
      </Card>
    </StackScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  footerRow: { flexDirection: "row", gap: spacing.sm },
  vars: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  varChip: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  preview: { lineHeight: 22 },
}));
