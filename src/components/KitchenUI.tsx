import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={ui.page}
      contentContainerStyle={ui.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={ui.card}>{children}</View>;
}
export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={ui.title}>{children}</Text>;
}
export function Copy({ children }: { children: React.ReactNode }) {
  return <Text style={ui.copy}>{children}</Text>;
}
export function Field({
  label,
  value,
  onChangeText,
  numeric = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          ui.input,
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        placeholderTextColor="#86756b"
      />
    </View>
  );
}
export function Action({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        ui.button,
        secondary && ui.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[ui.buttonText, secondary && { color: "#6b4133" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={ui.row}>
      {options.map((o) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: o.value === value }}
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[ui.chip, o.value === value && { backgroundColor: "#754f40" }]}
        >
          <Text style={{ color: o.value === value ? "#fff" : "#6b4133" }}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function useTask() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(task: () => Promise<void | string>, success = "") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await task();
      setMessage(result || success);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "A apărut o eroare. Încearcă din nou.",
      );
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    message,
    run,
    status: (
      <View accessibilityLiveRegion="polite">
        {busy && <ActivityIndicator color="#b56443" />}
        {!!message && <Text style={ui.message}>{message}</Text>}
      </View>
    ),
  };
}
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff6ef" },
  content: {
    padding: 20,
    gap: 18,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 50,
  },
  card: {
    padding: 20,
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#efddd0",
  },
  title: { fontSize: 26, fontFamily: "Baloo2_700Bold", color: "#563b30" },
  copy: { color: "#786359", lineHeight: 23, fontSize: 15 },
  label: { color: "#563b30", fontWeight: "600", fontSize: 14 },
  input: {
    backgroundColor: "#fffaf6",
    borderWidth: 1,
    borderColor: "#e3cdbd",
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    color: "#3b3029",
  },
  button: {
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#b56443",
  },
  secondary: { backgroundColor: "#faeadd" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: "#faeadd",
  },
  message: { color: "#8c422d", lineHeight: 23, marginTop: 8 },
  small: { fontSize: 13, color: "#86756b" },
});
