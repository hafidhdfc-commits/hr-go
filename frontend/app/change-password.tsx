import { useState } from "react";
import { useRouter } from "expo-router";
import { StackScreen } from "@/src/components/stack-screen";
import { Field, Button } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { api } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { spacing } from "@/src/theme";

export default function ChangePassword() {
  const router = useRouter();
  const toast = useToast();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (newPw.length < 4) return toast.show("New password too short", "error");
    if (newPw !== confirm) return toast.show("Passwords do not match", "error");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { old_password: oldPw, new_password: newPw });
      toast.show("Password updated", "success");
      router.back();
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StackScreen title="Change Password" subtitle="Update your own password">
      <Field label="Current Password" value={oldPw} onChangeText={setOldPw} secureTextEntry autoCapitalize="none" testID="old-password" />
      <Field label="New Password" value={newPw} onChangeText={setNewPw} secureTextEntry autoCapitalize="none" testID="new-password" />
      <Field label="Confirm New Password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" testID="confirm-password" />
      <Button title="Update Password" onPress={submit} loading={loading} style={{ marginTop: spacing.lg }} testID="submit-change-password" />
    </StackScreen>
  );
}
