import { Redirect } from "expo-router";
import { Car, ClockCounterClockwise, User } from "phosphor-react-native";
import { Tabs } from "@/src/navigation";
import { useAuth } from "@/src/auth";
import { Loading } from "@/src/components/ui";
import { makeTabBar } from "@/src/components/tab-bar";

const TabBar = makeTabBar([
  { name: "trips", label: "My Trips", icon: Car },
  { name: "history", label: "History", icon: ClockCounterClockwise },
  { name: "profile", label: "Profile", icon: User },
]);

export default function DriverLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "DRIVER") return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
