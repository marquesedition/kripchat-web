import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/features/auth/authStore";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);

  if (initialized && !session) {
    return <Redirect href="/(auth)/login" />;
  }
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "rgba(22, 24, 29, 0.95)",
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8
        },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: "700" }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: "Info",
          tabBarIcon: ({ color, size }) => <Ionicons name="information-circle-outline" color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
