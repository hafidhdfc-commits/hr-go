import { View } from "react-native";
import { TabScreen } from "@/src/components/screen";
import { AppText, Card, InfoRow, Button } from "@/src/components/ui";
import { makeStyles, spacing, radius } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { useRouter } from "expo-router";
import { fmtDate, initials } from "@/src/format";

export default function DriverProfile() {
  const styles = useStyles();
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <TabScreen title="My Profile" subtitle="Driver account" testID="driver-profile">
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <AppText variant="title" color="onBrandPrimary">
            {initials(user?.full_name).toUpperCase()}
          </AppText>
        </View>
        <AppText variant="heading">{user?.full_name}</AppText>
        <AppText variant="caption">{user?.driver_id || "Driver"}</AppText>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <InfoRow label="Phone" value={user?.phone} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="License No." value={user?.license_number} />
        <InfoRow label="License Expiry" value={fmtDate(user?.license_expiry)} />
        <InfoRow label="Emergency Contact" value={user?.emergency_contact} />
        <InfoRow label="Status" value={user?.status} />
      </Card>

      <Button title="Change Password" variant="outline" style={{ marginTop: spacing.lg }} onPress={() => router.push("/change-password")} testID="driver-change-password" />
      <Button title="Log out" variant="danger" style={{ marginTop: spacing.sm }} onPress={logout} testID="driver-logout" />
    </TabScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
