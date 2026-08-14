import { Stack } from "expo-router";
import { useAppStore } from "@/store/app-store";

export default function RootLayout() {
  const hasEntered = useAppStore((state) => state.hasEntered);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasEntered}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>

      <Stack.Protected guard={hasEntered}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="new-receipe"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "New recipe",
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
