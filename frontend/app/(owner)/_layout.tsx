import { Redirect } from "expo-router";
import { ChartBar, Van, UsersThree, DotsThreeCircle } from "phosphor-react-native";
import { Tabs } from "@/src/navigation";
import { useAuth } from "@/src/auth";
import { Loading } from "@/src/components/ui";
import { makeTabBar } from "@/src/components/tab-bar";

const TabBar = makeTabBar([
  { name: "dashboard", label: "Overview", icon: ChartBar },
  { name: "operations", label: "Operations", icon: Van },
  { name: "users", label: "Users", icon: UsersThree },
  { name: "more", label: "More", icon: DotsThreeCircle },
]);

export default function OwnerLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "OWNER") return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="operations" />
      <Tabs.Screen name="users" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
