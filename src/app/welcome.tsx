import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";

export default function WelcomeScreen() {
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
      <View style={{gap: 6, marginBottom: 60}}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push("/create-account")}
        >
          <Text style={styles.buttonText}>Create account</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.buttonText}>Log in 🥕</Text>
        </Pressable>
      </View>
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
    textAlign: "center"
  },
});
