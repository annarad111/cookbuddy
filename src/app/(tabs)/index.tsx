import { useEffect } from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useReceipeStore } from "@/store/receipe-store";
import RecipeList from "@/components/RecipeList";

export default function HomeScreen() {
  const receipes = useReceipeStore((state) => state.receipes);
  const fetchReceipes = useReceipeStore((state) => state.fetchReceipes);

  useEffect(() => {
    fetchReceipes();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <RecipeList data={receipes} emptyMessage={`No recipes yet,\n Let's start creating them!`} />
      <Link href="/new-receipe" asChild>
        <Pressable style={styles.addButton}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDE2DD", alignItems: "center" },
  addButton: {
    backgroundColor: "#FF8A65",
    paddingVertical: 1,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    position: "absolute",
    bottom: "3%",
    right: "3%",
  },
  buttonText: { color: "#fff", fontSize: 46, fontWeight: "600" },
});