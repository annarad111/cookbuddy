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


  if (!fontsLoaded) {
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