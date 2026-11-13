import { Stack } from "expo-router";
import { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
} from "@expo-google-fonts/baloo-2";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { useKitchenStore } from "@/store/kitchen-store";
import { useReceipeStore } from "@/store/receipe-store";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);
  const initAuth = useAuthStore((state) => state.initAuth);

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    const kitchen = useKitchenStore.getState();
    useReceipeStore.getState().reset();
    kitchen.reset();
    if (session?.user.id) {
      void kitchen
        .load()
        .then(() => useReceipeStore.getState().fetchReceipes())
        .catch(() => useReceipeStore.getState().fetchReceipes());
    }
  }, [session?.user.id]);

  const householdId = useKitchenStore((s) => s.household?.id);
  useEffect(() => {
    if (!householdId) return;
    // Realtime is optional. Every screen also provides an explicit refresh action.
    const channel = supabase
      .channel(`kitchen-${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cookbuddy_state",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void useKitchenStore
            .getState()
            .load()
            .catch(() => {});
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipes",
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void useReceipeStore.getState().fetchReceipes();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId]);

  if (!fontsLoaded || loading) {
    return null;
  }

  const hasEntered = !!session;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasEntered}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="create-account" />
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={hasEntered}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="import-recipe"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Import a recipe",
          }}
        />
        <Stack.Screen name="receipe/[id]" />
        <Stack.Screen
          name="new-receipe"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Recipe",
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
