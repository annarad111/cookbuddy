import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppStore } from "@/store/app-store";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

export default function WelcomeScreen() {
  const enter = useAppStore((state) => state.enter);

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require("../../assets/images/logocookbuddy.png")}
        style={{ width: 400, height: 200 }}
        contentFit="contain"
      />
      <Image
        source={require("../../assets/animations/bunny.gif")}
        style={{ width: 400, height: 300, marginBlockStart: 150 }}
        contentFit="contain"
      />
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={enter}
      >
        <Text style={styles.buttonText}>Enter 🥕</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDE2DD",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "red",
  },
  button: {
    backgroundColor: "#FF8A65",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
