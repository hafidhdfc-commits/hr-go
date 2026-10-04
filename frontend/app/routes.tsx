import { useState } from "react";
import { View, Pressable, Modal, ScrollView } from "react-native";
import { Plus, X, Trash } from "phosphor-react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Button, Field, Loading, EmptyState } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { api, useGet, useInvalidate } from "@/src/hooks";
import { ApiError } from "@/src/api";
import { confirmDelete } from "@/src/utils/confirm";
import { useAuth } from "@/src/auth";
import { spacing, radius, makeStyles, useTheme } from "@/src/theme";
import { rupiah } from "@/src/format";

type Route = { id: string; name: string; origin: string; destination: string; base_price: number };

export default function Routes() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const invalidate = useInvalidate();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { data, isLoading } = useGet<Route[]>(["routes"], "/routes");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState<any>({ base_price: "0" });

  const set = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }));
  const add = () => {
    setEditId(null);
    setF({ base_price: "0" });
    setOpen(true);
  };
  const edit = (r: Route) => {
    setEditId(r.id);
    setF({ ...r, base_price: String(r.base_price) });
    setOpen(true);
  };

  const onDelete = async (r: Route) => {
    const ok = await confirmDelete(`Delete route "${r.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await api.del(`/routes/${r.id}`);
      invalidate([["routes"]]);
      toast.show("Route deleted", "success");
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  const save = async () => {    if (!f.name || !f.origin || !f.destination) return toast.show("All fields required", "error");
    const body = { name: f.name, origin: f.origin, destination: f.destination, base_price: parseInt(f.base_price || "0", 10) };
    try {
      if (editId) await api.patch(`/routes/${editId}`, body);
      else await api.post("/routes", body);
      invalidate([["routes"]]);
      toast.show("Saved", "success");
      setOpen(false);
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : "Failed", "error");
    }
  };

  return (
    <StackScreen
      title="Routes & Pricing"
      subtitle="Standard routes & base fares"
      roles={["OWNER", "ADMIN"]}
      right={
        <Pressable testID="add-route" onPress={add} style={styles.add}>
          <Plus size={18} color={colors.onBrandPrimary} weight="bold" />
        </Pressable>
      }
    >
      {isLoading ? (
        <Loading />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No routes" subtitle="Add common routes with base pricing." />
      ) : (
        (data || []).map((r) => (
          <Card key={r.id} style={styles.card} onPress={() => edit(r)} testID={`route-${r.id}`}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{r.name}</AppText>
                <AppText variant="caption">
                  {r.origin} → {r.destination}
                </AppText>
              </View>
              <AppText variant="bodyMedium" color="success">
                {rupiah(r.base_price)}
              </AppText>
              {isOwner ? (
                <Pressable testID={`delete-route-${r.id}`} hitSlop={10} style={styles.trash} onPress={() => onDelete(r)}>
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
              <AppText variant="heading">{editId ? "Edit Route" : "New Route"}</AppText>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <X size={22} color={colors.onSurface} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: spacing.md }}>
              <Field label="Route Name" value={f.name || ""} onChangeText={set("name")} testID="route-name" />
              <Field label="Origin" value={f.origin || ""} onChangeText={set("origin")} testID="route-origin" />
              <Field label="Destination" value={f.destination || ""} onChangeText={set("destination")} testID="route-destination" />
              <Field label="Base Price (Rp)" value={String(f.base_price || "")} onChangeText={set("base_price")} keyboardType="numeric" testID="route-price" />
              <Button title="Save Route" onPress={save} testID="save-route" />
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
