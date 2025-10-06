import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function TabLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#176298",
          headerBackgroundContainerStyle: { backgroundColor: "#176298" },
          // tabBarStyle: { display: 'none' }, // Re-enabled tab bar
          headerShown: true, // Ensure header is shown
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: "Campaigns",
          tabBarIcon: ({ color }) => (
            <Ionicons name="pricetags" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: "Leads",
          headerTitle: "Leads", // This can be overridden by the screen
          tabBarIcon: ({ color }) => (
            <Ionicons name="git-network-sharp" size={28} color={color} />
          ),
        }}
      />
        <Tabs.Screen name="location" options={{ href: null }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }) => (
              <Ionicons name="person-outline" size={28} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
