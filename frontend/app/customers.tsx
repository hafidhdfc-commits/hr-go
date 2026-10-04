import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Plus, Buildings, Phone } from "phosphor-react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Badge, Loading, EmptyState } from "@/src/components/ui";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { userStatusKind } from "@/src/format";

type Customer = {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  whatsapp?: string;
  contract_type?: string;
  status: string;
};

export default function Customers() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { data, isLoading, refetch } = useGet<Customer[]>(["customers"], "/customers");

  return (
    <StackScreen
      title="Customers"
      subtitle="Companies & passengers"
      roles={["OWNER", "ADMIN"]}
      right={
        <Pressable testID="add-customer" onPress={() => router.push("/customer-form")} style={styles.add}>
          <Plus size={18} color={colors.onBrandPrimary} weight="bold" />
        </Pressable>
      }
    >
      {isLoading ? (
        <Loading />
      ) : (data || []).length === 0 ? (
        <EmptyState title="No customers" subtitle="Add your first customer." />
      ) : (
        (data || []).map((c) => (
          <Card key={c.id} style={styles.card} onPress={() => router.push(`/customer-form?id=${c.id}`)} testID={`customer-${c.id}`}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyMedium">{c.name}</AppText>
                {c.company ? (
                  <View style={styles.meta}>
                    <Buildings size={12} color={colors.muted} />
                    <AppText variant="caption">{c.company}</AppText>
                  </View>
                ) : null}
                {c.phone ? (
                  <View style={styles.meta}>
                    <Phone size={12} color={colors.muted} />
                    <AppText variant="caption">{c.phone}</AppText>
                  </View>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Badge label={c.status} kind={userStatusKind(c.status)} />
                {c.contract_type === "MONTHLY_CONTRACT" ? <AppText variant="caption">Monthly</AppText> : null}
              </View>
            </View>
          </Card>
        ))
      )}
    </StackScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  add: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  card: { marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },
  meta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
}));
