import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useReceipeStore } from "@/store/receipe-store";
import RecipeList from "@/components/RecipeList";

export default function Favorites() {
  const receipes = useReceipeStore((state) => state.receipes);
  const favorites = receipes.filter((r) => r.is_favorite);

  return (
    <SafeAreaView style={styles.container}>
      <RecipeList data={favorites} emptyMessage={`No favorites yet,\nlet's start creating them!`} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDE2DD", alignItems: "center" },
});