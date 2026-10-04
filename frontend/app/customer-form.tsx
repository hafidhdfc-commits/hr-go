import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StackScreen } from "@/src/components/stack-screen";
import { Field, Button } from "@/src/components/ui";
import { Select } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";

const CONTRACT = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "MONTHLY_CONTRACT", label: "Monthly Contract" },
];
const STATUS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function CustomerForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();
  const editing = !!params.id;
  const { data: existing } = useGet<any>(["customer", params.id], `/customers/${params.id}`, editing);
  const [f, setF] = useState<any>({ contract_type: "ONE_TIME", status: "ACTIVE" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existing) setF({ ...existing });
  }, [existing]);

  const set = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.name) return toast.show("Name is required", "error");
    const body = {
      name: f.name, company: f.company, phone: f.phone, whatsapp: f.whatsapp || f.phone,
      email: f.email, billing_contact: f.billing_contact, billing_email: f.billing_email,
      address: f.address, contract_type: f.contract_type || "ONE_TIME", status: f.status || "ACTIVE",
    };
    try {
      setLoading(true);
      if (editing) await api.patch(`/customers/${params.id}`, body);
      else await api.post("/customers", body);
      invalidate([["customers"]]);
      toast.show(editing ? "Customer updated" : "Customer created", "success");
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StackScreen
      title={editing ? "Edit Customer" : "New Customer"}
      roles={["OWNER", "ADMIN"]}
      footer={<Button title={editing ? "Save" : "Create Customer"} onPress={save} loading={loading} testID="save-customer" />}
    >
      <Field label="Customer Name" value={f.name || ""} onChangeText={set("name")} testID="customer-name" />
      <Field label="Company" value={f.company || ""} onChangeText={set("company")} testID="customer-company" />
      <Field label="Phone" value={f.phone || ""} onChangeText={set("phone")} keyboardType="phone-pad" testID="customer-phone" />
      <Field label="WhatsApp (+62...)" value={f.whatsapp || ""} onChangeText={set("whatsapp")} keyboardType="phone-pad" testID="customer-whatsapp" />
      <Field label="Email" value={f.email || ""} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Billing Contact" value={f.billing_contact || ""} onChangeText={set("billing_contact")} />
      <Field label="Billing Email" value={f.billing_email || ""} onChangeText={set("billing_email")} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Address" value={f.address || ""} onChangeText={set("address")} multiline />
      <Select label="Contract Type" value={f.contract_type} options={CONTRACT} onChange={set("contract_type")} testID="customer-contract" />
      <Select label="Status" value={f.status} options={STATUS} onChange={set("status")} testID="customer-status" />
    </StackScreen>
  );
}
