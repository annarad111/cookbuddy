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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function CreateAccount() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Alert.alert is a no-op on web, so feedback is shown inline on every platform.
  const handleSignUp = async () => {
    if (busy) return;
    if (!email.trim() || password.length < 6) {
      setMessage("Introdu un email valid și o parolă de minimum 6 caractere.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      // With "Confirm email" enabled in Supabase there is no session yet.
      if (!data.session)
        setMessage(
          "Cont creat! Verifică emailul și apasă linkul de confirmare, apoi intră în cont.",
        );
    } catch {
      setMessage("Nu m-am putut conecta la server. Verifică internetul.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable
        style={{ backgroundColor: "#ffffff91", padding: 10, borderRadius: 100, alignSelf: "flex-start" }}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back-outline" size={24} color="#3A3A3A" />
      </Pressable>
      <Text style={styles.title}>Create account</Text>
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
        onSubmitEditing={handleSignUp}
      />
      {!!message && <Text style={styles.message}>{message}</Text>}
      <Pressable
        style={[styles.button, busy && { opacity: 0.6 }]}
        onPress={handleSignUp}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign up</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDE2DD",
    padding: 20,
    justifyContent: "center",
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
  message: {
    color: "#8c422d",
    textAlign: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});
