import { View, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, CaretLeft } from "phosphor-react-native";
import { AppText, Badge, Loading, EmptyState } from "@/src/components/ui";
import { makeStyles, spacing, radius, useTheme } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { rupiah, fmtDate, invoiceStatusKind } from "@/src/format";

export type Invoice = {
  id: string;
  invoice_number: string;
  kind: string;
  customer_name: string;
  customer_company?: string;
  period_label?: string;
  trip_count: number;
  total: number;
  payment_status: string;
  created_at?: string;
};

export function InvoicesView({ withBack }: { withBack?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useGet<Invoice[]>(["invoices"], "/invoices");

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          {withBack ? (
            <Pressable onPress={() => router.back()} hitSlop={10} testID="invoices-back" style={styles.back}>
              <CaretLeft size={22} color={colors.onSurface} weight="bold" />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <AppText variant="title">Invoices</AppText>
            <AppText variant="caption">Daily & monthly billing</AppText>
          </View>
        </View>
      </View>
      {isLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          renderItem={({ item }) => (
            <Pressable style={styles.card} testID={`invoice-${item.id}`} onPress={() => router.push(`/invoice/${item.id}`)}>
              <View style={styles.cardTop}>
                <AppText variant="label">{item.invoice_number}</AppText>
                <Badge label={item.payment_status} kind={invoiceStatusKind(item.payment_status)} />
              </View>
              <AppText variant="heading" numberOfLines={1}>
                {item.customer_name}
              </AppText>
              <AppText variant="caption">
                {item.kind} · {item.trip_count} trip(s) · {item.period_label || fmtDate(item.created_at)}
              </AppText>
              <View style={styles.cardBottom}>
                <AppText variant="caption">{fmtDate(item.created_at)}</AppText>
                <AppText variant="bodyMedium">{rupiah(item.total)}</AppText>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="No invoices yet" subtitle="Generate a daily or monthly invoice." />}
        />
      )}
      <Pressable testID="fab-new-invoice" style={styles.fab} onPress={() => router.push("/invoice-create")}>
        <Plus size={26} color={colors.onBrandPrimary} weight="bold" />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  back: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing["3xl"] },
  card: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: 4 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
}));
