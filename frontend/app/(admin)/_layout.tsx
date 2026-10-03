import { Redirect } from "expo-router";
import { ChartBar, Van, Receipt, DotsThreeCircle } from "phosphor-react-native";
import { Tabs } from "@/src/navigation";
import { useAuth } from "@/src/auth";
import { Loading } from "@/src/components/ui";
import { makeTabBar } from "@/src/components/tab-bar";

const TabBar = makeTabBar([
  { name: "dashboard", label: "Dashboard", icon: ChartBar },
  { name: "trips", label: "Trips", icon: Van },
  { name: "invoices", label: "Invoices", icon: Receipt },
  { name: "more", label: "More", icon: DotsThreeCircle },
]);

export default function AdminLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "ADMIN") return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="invoices" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
