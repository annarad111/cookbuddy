import { useLocalSearchParams } from "expo-router";
import { useReceipeStore } from "@/store/receipe-store";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

export default function ReceipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipe = useReceipeStore((state) =>
    state.receipes.find((r) => r.id === id),
  );

  if (!receipe) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Rețeta nu a fost găsită</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{receipe.title}</Text>
      <Text>Servings: {receipe.servings}</Text>
      <Text>
        Ingredients:
        {receipe.ingredients.map((item) => (
          <View key={item.id}>
            <Text>{item.name}</Text>
            <Text>{item.amount}</Text>
          </View>
        ))}
      </Text>

      <Link href="/" asChild>
        <Pressable>
          <Text>Return</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "500" },
});
