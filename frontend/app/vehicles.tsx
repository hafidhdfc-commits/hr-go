import { useState } from "react";
import { View, Pressable, Modal, ScrollView } from "react-native";
import { Plus, X, Trash } from "phosphor-react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Badge, Button, Field, Loading, EmptyState } from "@/src/components/ui";
import { Select } from "@/src/components/select";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { confirmDelete } from "@/src/utils/confirm";
import { useAuth } from "@/src/auth";
import { spacing, radius, makeStyles, useTheme } from "@/src/theme";

type Vehicle = { id: string; name: string; plate: string; type?: string; capacity?: number; status: string };

const STATUS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ON_TRIP", label: "On Trip" },
  { value: "MAINTENANCE", label: "Maintenance" },
];
const statusKind = (s: string) => (s === "AVAILABLE" ? "success" : s === "MAINTENANCE" ? "error" : "warning");

export default function Vehicles() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const invalidate = useInvalidate();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { data, isLoading } = useGet<Vehicle[]>(["vehicles"], "/vehicles");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ status: "AVAILABLE", type: "Van", capacity: "6" });
  const [editId, setEditId] = useState<string | null>(null);

  const set = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }));

  const edit = (v: Vehicle) => {
    setEditId(v.id);
    setF({ ...v, capacity: String(v.capacity ?? 6) });
    setOpen(true);
  };
  const add = () => {
    setEditId(null);
    setF({ status: "AVAILABLE", type: "Van", capacity: "6" });
    setOpen(true);
  };

  const onDelete = async (v: Vehicle) => {
    const ok = await confirmDelete(`Delete vehicle "${v.name}" (${v.plate})? This cannot be undone.`);
    if (!ok) return;
    try {
      await api.del(`/vehicles/${v.id}`);
      invalidate([["vehicles"]]);
      toast.show("Vehicle deleted", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const save = async () => {
    if (!f.name || !f.plate) return toast.show("Name & plate required", "error");
    const body = { name: f.name, plate: f.plate, type: f.type, capacity: parseInt(f.capacity || "6", 10), status: f.status };
    try {
      if (editId) await api.patch(`/vehicles/${editId}`, body);
      else await api.post("/vehicles", body);
      invalidate([["vehicles"]]);
      toast.show("Saved", "success");
      setOpen(false);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  return (
    <StackScreen
      title="Vehicles"
      subtitle="Fleet management"
      roles={["OWNER", "ADMIN"]}
      right={
        <Pressable testID="add-vehicle" onPress={add} style={styles.add}>
          <Plus size={18} color={colors.onBrandPrimary} weight="bold" />
        </Pressable>
      }
    >
      {isLoading ? (
        <Loading />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No vehicles" subtitle="Add your fleet vehicles." />
      ) : (
        (data || []).map((v) => (
          <Card key={v.id} style={styles.card} onPress={() => edit(v)} testID={`vehicle-${v.id}`}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{v.name}</AppText>
                <AppText variant="caption">
                  {v.plate} · {v.type} · {v.capacity} seats
                </AppText>
              </View>
              <Badge label={v.status.replace("_", " ")} kind={statusKind(v.status) as any} />
              {isOwner ? (
                <Pressable testID={`delete-vehicle-${v.id}`} hitSlop={10} style={styles.trash} onPress={() => onDelete(v)}>
                  <Trash size={18} color={colors.error} weight="bold" />
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.head}>
              <AppText variant="heading">{editId ? "Edit Vehicle" : "New Vehicle"}</AppText>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <X size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: spacing.md }}>
              <Field label="Name" value={f.name || ""} onChangeText={set("name")} testID="vehicle-name" />
              <Field label="Plate" value={f.plate || ""} onChangeText={set("plate")} testID="vehicle-plate" />
              <Field label="Type" value={f.type || ""} onChangeText={set("type")} />
              <Field label="Capacity" value={String(f.capacity || "")} onChangeText={set("capacity")} keyboardType="numeric" />
              <Select label="Status" value={f.status} options={STATUS} onChange={set("status")} testID="vehicle-status" />
              <Button title="Save Vehicle" onPress={save} testID="save-vehicle" />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </StackScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  add: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  trash: { padding: spacing.xs },
  backdrop: { flex: 1, backgroundColor: "rgba(6,27,58,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"], maxHeight: "85%" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
}));
