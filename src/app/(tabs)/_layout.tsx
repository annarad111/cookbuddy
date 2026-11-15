import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { TAB_HELP, helpTopic } from "@/constants/help";
import { showDialog } from "@/store/overlay-store";
import { useAuthStore } from "@/store/auth-store";
import { hasSeenTour } from "@/lib/onboarding";

// ⓘ bubble opposite the title: explains the current tab, with a way back to the tour.
function HelpButton({ route, title }: { route: string; title: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Help: ${title}`}
      hitSlop={8}
      onPress={async () => {
        const topic = helpTopic(TAB_HELP[route] ?? "welcome");
        const choice = await showDialog({
          title: topic.title,
          message:
            topic.body +
            (topic.tips.length
              ? "\n\n" + topic.tips.map((t) => "🥕 " + t).join("\n")
              : ""),
          mood: topic.mood,
          buttons: [
            { label: "Show the tour", value: "tour" },
            { label: "Got it", value: "ok", primary: true },
          ],
        });
        if (choice === "tour") router.push("/onboarding");
      }}
      style={{
        marginRight: 16,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#faeadd",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="information-circle-outline" size={24} color="#b56443" />
    </Pressable>
  );
}

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
const TAB_TITLES: Record<string, string> = {
  index: "Recipes",
  planner: "Plan",
  shopping: "Shopping",
  pantry: "Pantry",
  favorites: "Favorites",
  profile: "Profile",
};
export default function Layout() {
  const userId = useAuthStore((s) => s.session?.user.id);
  // First time this account opens the app on this device: show the welcome tour.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void hasSeenTour(userId).then((seen) => {
      if (active && !seen) router.push("/onboarding");
    });
    return () => {
      active = false;
    };
  }, [userId]);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: "#b56443",
        tabBarInactiveTintColor: "#877268",
        tabBarStyle: { backgroundColor: "#fffaf6" },
        headerStyle: { backgroundColor: "#fff6ef" },
        headerTitleStyle: { color: "#563b30", fontFamily: "Baloo2_700Bold" },
        headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle>,
        headerTitleAlign: "left",
        headerRight: () => (
          <HelpButton route={route.name} title={TAB_TITLES[route.name] ?? route.name} />
        ),
      })}
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
