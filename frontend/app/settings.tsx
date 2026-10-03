import { useState, useEffect } from "react";
import { StackScreen } from "@/src/components/stack-screen";
import { Field, Button, SectionHeader, Loading, AppText } from "@/src/components/ui";
import { Select } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { spacing } from "@/src/theme";
import { useAuth } from "@/src/auth";

const YESNO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const invalidate = useInvalidate();
  const isOwner = user?.role === "OWNER";
  const { data, isLoading } = useGet<any>(["settings"], "/settings");
  const [f, setF] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (data) setF({ ...data, admin_can_edit_templates: data.admin_can_edit_templates ? "yes" : "no" });
  }, [data]);

  const set = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    try {
      setLoading(true);
      await api.patch("/settings", {
        company_name: f.company_name, brand: f.brand, business_name: f.business_name, tagline: f.tagline,
        address: f.address, phone: f.phone, email: f.email, website: f.website, tax_info: f.tax_info,
        bank_account: f.bank_account, google_maps_prefer: f.google_maps_prefer,
        admin_can_edit_templates: f.admin_can_edit_templates === "yes",
      });
      invalidate([["settings"]]);
      toast.show("Settings saved", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <StackScreen title="System Settings" roles={["OWNER", "ADMIN"]}><Loading /></StackScreen>;

  return (
    <StackScreen
      title="System Settings"
      subtitle={isOwner ? "Company & system configuration" : "View only (Owner editable)"}
      roles={["OWNER", "ADMIN"]}
      footer={isOwner ? <Button title="Save Settings" onPress={save} loading={loading} testID="save-settings" /> : undefined}
    >
      {!isOwner ? (
        <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
          Only the Owner can modify system settings.
        </AppText>
      ) : null}
      <SectionHeader title="Company Information" />
      <Field label="Company Name" value={f.company_name || ""} onChangeText={set("company_name")} testID="set-company-name" />
      <Field label="Brand" value={f.brand || ""} onChangeText={set("brand")} />
      <Field label="Business Name" value={f.business_name || ""} onChangeText={set("business_name")} />
      <Field label="Tagline" value={f.tagline || ""} onChangeText={set("tagline")} />
      <Field label="Address" value={f.address || ""} onChangeText={set("address")} multiline />
      <Field label="Phone" value={f.phone || ""} onChangeText={set("phone")} keyboardType="phone-pad" />
      <Field label="Email" value={f.email || ""} onChangeText={set("email")} autoCapitalize="none" />
      <Field label="Website" value={f.website || ""} onChangeText={set("website")} autoCapitalize="none" />

      <SectionHeader title="Invoice & Banking" />
      <Field label="Tax Information" value={f.tax_info || ""} onChangeText={set("tax_info")} />
      <Field label="Bank Account" value={f.bank_account || ""} onChangeText={set("bank_account")} multiline />

      <SectionHeader title="Configuration" />
      <Select label="Admin can edit WhatsApp templates" value={f.admin_can_edit_templates} options={YESNO} onChange={set("admin_can_edit_templates")} testID="set-admin-templates" />
      <Field label="Preferred Maps (google)" value={f.google_maps_prefer || ""} onChangeText={set("google_maps_prefer")} autoCapitalize="none" />
    </StackScreen>
  );
}
