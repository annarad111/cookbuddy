import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Alert.alert is a no-op on web, so feedback is shown inline on every platform.
  const handleLogin = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      // On success the auth listener switches to the app automatically.
      if (error)
        setMessage(
          error.message === "Invalid login credentials"
            ? "Wrong email or password."
            : error.message === "Email not confirmed"
              ? "Confirm your email address first (check your inbox)."
              : error.message,
        );
    } catch {
      setMessage("Could not reach the server. Check your internet connection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        style={{ backgroundColor: "#ffffff91", padding: 10, borderRadius: 100, position: 'absolute', top: 60, left: 15 }}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back-outline" size={24} color="#3A3A3A" />
      </Pressable>
      <View style={{ display: "flex", alignItems: "center", marginTop: 50, gap: 10, marginBottom: 10 }}>
        <Text style={styles.carrot}>🥕</Text>
        <Text style={{fontWeight: "bold", fontFamily: "Baloo2_700Bold", fontSize: 30 }}>Welcome back</Text>
        <Text style={{color: '#AB6C66', fontFamily: "Nunito_400Regular"}}>Log in to your CookBuddy account</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#7c7474"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#7c7474"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onSubmitEditing={handleLogin}
      />
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Pressable
        style={[styles.button, busy && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log in</Text>
        )}
      </Pressable>
      <Text style={styles.bottomLink}>Don't have an account? <Link href={'/create-account'} style={{color: "#E8703A", fontFamily: 'Baloo2_700Bold'}}>Sign up</Link></Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  carrot: {
    backgroundColor: "#FF8A65",
    padding: 10,
    borderRadius: 20,
    fontSize: 50,
  },
  container: {
    flex: 1,
    backgroundColor: "#FDE2DD",
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#FF8A65",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  message: {
    color: "#8c422d",
    textAlign: "center",
  },
  bottomLink:{
    position: 'absolute',
    bottom: 30,
    textAlign: 'center',
    left: '25%',
    fontSize: 16
  }
});
