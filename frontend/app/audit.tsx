import { View } from "react-native";
import { StackScreen } from "@/src/components/stack-screen";
import { AppText, Card, Badge, Loading, EmptyState, ChipRow } from "@/src/components/ui";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { useGet } from "@/src/hooks";
import { useAuth } from "@/src/auth";
import { fmtDateTime } from "@/src/format";
import { useState } from "react";

type Log = {
  id: string;
  actor_name?: string;
  actor_role: string;
  action: string;
  category: string;
  trip_number?: string;
  customer?: string;
  old_value?: any;
  new_value?: any;
  reason?: string;
  created_at?: string;
};

const catKind: Record<string, any> = {
  FINANCIAL: "warning",
  SECURITY: "error",
  USER: "info",
  CONTACT: "success",
  OPERATION: "muted",
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OPERATION", label: "Operations" },
  { key: "FINANCIAL", label: "Financial" },
  { key: "USER", label: "Users" },
  { key: "SECURITY", label: "Security" },
  { key: "CONTACT", label: "Contact" },
];

export default function Audit() {
  const styles = useStyles();
  const { user } = useAuth();
  const [filter, setFilter] = useState("ALL");
  const { data, isLoading } = useGet<Log[]>(["audit"], "/audit-logs");

  const logs = (data || []).filter((l) => filter === "ALL" || l.category === filter);

  return (
    <StackScreen title="Audit Logs" subtitle={user?.role === "OWNER" ? "Complete system activity" : "Operational activity"} roles={["OWNER", "ADMIN"]}>
      <ChipRow options={FILTERS} value={filter} onChange={setFilter} />
      {isLoading ? (
        <Loading />
      ) : logs.length === 0 ? (
        <EmptyState title="No activity" subtitle="Actions will be logged here." />
      ) : (
        <View style={styles.list}>
          {logs.map((l) => (
            <Card key={l.id} style={styles.card}>
              <View style={styles.top}>
                <AppText variant="bodyMedium" style={{ flex: 1 }}>
                  {l.action}
                </AppText>
                <Badge label={l.category} kind={catKind[l.category] || "muted"} />
              </View>
              <AppText variant="caption">
                {l.actor_role}: {l.actor_name}
                {l.trip_number ? ` · ${l.trip_number}` : ""}
                {l.customer ? ` · ${l.customer}` : ""}
              </AppText>
              {l.old_value != null || l.new_value != null ? (
                <AppText variant="caption">
                  {String(l.old_value ?? "-")} → {String(l.new_value ?? "-")}
                </AppText>
              ) : null}
              {l.reason ? (
                <AppText variant="caption" color="warning">
                  Reason: {l.reason}
                </AppText>
              ) : null}
              <AppText variant="caption" color="muted">
                {fmtDateTime(l.created_at)}
              </AppText>
            </Card>
          ))}
        </View>
      )}
    </StackScreen>
  );
}

const useStyles = makeStyles(() => ({
  list: { paddingTop: spacing.md, gap: spacing.sm },
  card: { gap: 2 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
}));
