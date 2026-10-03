import { useState, useEffect } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StackScreen } from "@/src/components/stack-screen";
import { Field, Button, SectionHeader, AppText, Card } from "@/src/components/ui";
import { Select } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { spacing } from "@/src/theme";
import type { User } from "@/src/auth";

const STATUS_OPTS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

export default function UserForm() {
  const params = useLocalSearchParams<{ role?: string; id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const invalidate = useInvalidate();
  const editing = !!params.id;
  const { data: existing } = useGet<User>(["user", params.id], `/users/${params.id}`, editing);

  const [role, setRole] = useState((params.role as string) || "ADMIN");
  const [f, setF] = useState<any>({ status: "ACTIVE" });
  const [password, setPassword] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existing) {
      setRole(existing.role);
      setF({ ...existing });
    }
  }, [existing]);

  const set = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }));
  const isDriver = role === "DRIVER";

  const save = async () => {
    if (!f.full_name) return toast.show("Full name is required", "error");
    try {
      setLoading(true);
      if (editing) {
        await api.patch(`/users/${params.id}`, {
          full_name: f.full_name, phone: f.phone, email: f.email, username: f.username,
          employee_id: f.employee_id, driver_id: f.driver_id, license_number: f.license_number,
          license_expiry: f.license_expiry, emergency_contact: f.emergency_contact, status: f.status,
        });
        toast.show("Account updated", "success");
      } else {
        if (!password) return toast.show("Password is required", "error");
        await api.post("/users", {
          full_name: f.full_name, phone: f.phone, email: f.email, username: f.username,
          password, role, status: f.status || "ACTIVE",
          employee_id: f.employee_id, driver_id: f.driver_id, license_number: f.license_number,
          license_expiry: f.license_expiry, emergency_contact: f.emergency_contact,
        });
        toast.show(role === "ADMIN" ? "Admin account successfully created." : "Driver account successfully created.", "success");
      }
      invalidate([["users"], ["owner-dashboard"]]);
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (status: string) => {
    try {
      await api.post(`/users/${params.id}/status`, { status });
      setF((p: any) => ({ ...p, status }));
      invalidate([["users"], ["user", params.id as string]]);
      toast.show(`Status set to ${status}`, "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const resetPassword = async () => {
    if (newPw.length < 4) return toast.show("Password too short", "error");
    try {
      await api.post(`/users/${params.id}/reset-password`, { new_password: newPw });
      setNewPw("");
      toast.show("Password reset", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const title = editing ? `Edit ${role === "ADMIN" ? "Admin" : "Driver"}` : role === "ADMIN" ? "Create Admin" : "Create Driver";

  return (
    <StackScreen
      title={title}
      subtitle={editing ? "Owner account management" : "New account · Role: " + role}
      roles={["OWNER"]}
      footer={
        <Button
          title={editing ? "Save Changes" : role === "ADMIN" ? "CREATE ADMIN" : "CREATE DRIVER"}
          onPress={save}
          loading={loading}
          testID="save-user"
        />
      }
    >
      <Field label="Full Name" value={f.full_name || ""} onChangeText={set("full_name")} testID="user-full-name" />
      <Field label="Phone" value={f.phone || ""} onChangeText={set("phone")} keyboardType="phone-pad" testID="user-phone" />
      <Field label="Email" value={f.email || ""} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" testID="user-email" />
      <Field label="Username (for login)" value={f.username || ""} onChangeText={set("username")} autoCapitalize="none" testID="user-username" />

      {isDriver ? (
        <>
          <Field label="Driver ID" value={f.driver_id || ""} onChangeText={set("driver_id")} testID="user-driver-id" />
          <Field label="License Number" value={f.license_number || ""} onChangeText={set("license_number")} testID="user-license" />
          <Field label="License Expiry (YYYY-MM-DD)" value={f.license_expiry || ""} onChangeText={set("license_expiry")} testID="user-license-expiry" />
          <Field label="Emergency Contact" value={f.emergency_contact || ""} onChangeText={set("emergency_contact")} keyboardType="phone-pad" testID="user-emergency" />
        </>
      ) : (
        <Field label="Employee ID" value={f.employee_id || ""} onChangeText={set("employee_id")} testID="user-employee-id" />
      )}

      <View style={{ height: spacing.xs }} />
      <Select label="Status" value={f.status} options={STATUS_OPTS} onChange={(v) => (editing ? changeStatus(v) : set("status")(v))} testID="user-status" />

      {!editing ? (
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" testID="user-password" />
      ) : (
        <Card style={{ marginTop: spacing.lg }}>
          <SectionHeader title="Reset Password" />
          <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
            Set a new password for this account. The existing password is never shown.
          </AppText>
          <Field label="New Password" value={newPw} onChangeText={setNewPw} secureTextEntry autoCapitalize="none" testID="reset-new-password" />
          <Button title="Reset Password" variant="outline" small style={{ marginTop: spacing.sm }} onPress={resetPassword} testID="reset-password-btn" />
        </Card>
      )}
    </StackScreen>
  );
}
