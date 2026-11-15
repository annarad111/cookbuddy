import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Text, View } from "react-native";

// Logo + screen name in the top bar of every tab.
function HeaderTitle({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image
        source={require("../../../assets/images/logo-small.png")}
        style={{ width: 40, height: 40 }}
        contentFit="contain"
        accessibilityLabel="CookBuddy"
      />
      <Text
        style={{ color: "#563b30", fontFamily: "Baloo2_700Bold", fontSize: 20 }}
      >
        {children}
      </Text>
    </View>
  );
}
export default function Layout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#b56443",
        tabBarInactiveTintColor: "#877268",
        tabBarStyle: { backgroundColor: "#fffaf6" },
        headerStyle: { backgroundColor: "#fff6ef" },
        headerTitleStyle: { color: "#563b30", fontFamily: "Baloo2_700Bold" },
        headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle>,
        headerTitleAlign: "left",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Plan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shopping",
          tabBarLabel: "List",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="basket-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          href: null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
