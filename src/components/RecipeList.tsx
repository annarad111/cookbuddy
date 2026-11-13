import {
  FlatList,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useReceipeStore, Receipe } from "@/store/receipe-store";
import { confirmAction } from "@/lib/confirm";

type Props = {
  data: Receipe[];
  emptyMessage: string;
};

export default function RecipeList({ data, emptyMessage }: Props) {
  const toggleFavorite = useReceipeStore((state) => state.toggleFavorite);
  const removeReceipe = useReceipeStore((state) => state.removeReceipe);
  async function remove(item: Receipe) {
    const ok = await confirmAction(
      "Delete recipe?",
      `"${item.title}" will be removed from your collection. Meals already in the plan keep their own copy.`,
    );
    if (!ok) return;
    try {
      await removeReceipe(item.id);
    } catch (e) {
      useReceipeStore.setState({
        error: e instanceof Error ? e.message : "Could not delete the recipe.",
      });
    }
  }

  if (data.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <View >
          <Image
          style={{width: 200, height:180, resizeMode: 'contain'}}
            source={require("../../assets/images/5.png")}
          />
        </View>
        <Text style={{textAlign:'center', fontSize: 18, fontFamily: "Baloo2_700Bold"}}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      contentContainerStyle={{ paddingHorizontal: "5%" }}
      style={{ width: "100%" }}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>🍽️</Text>
            </View>
          )}
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/receipe/[id]",
                params: { id: item.id },
              })
            }
            style={{ flex: 1 }}
          >
            <View style={{ marginTop: 10, flexDirection: "column", gap: 10 }}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.timeContainer}>
                <Text style={styles.subtitle}>
                  <Ionicons
                    name="restaurant-outline"
                    size={18}
                    color="#A8635A"
                  />
                  {item.servings}
                </Text>
                <Text style={styles.subtitle}>
                  <Ionicons name="time-outline" size={18} color="#A8635A" />
                  {item.time} min
                </Text>
                {item.calories != null && (
                  <Text style={styles.subtitle}>
                    <Ionicons name="flame-outline" size={18} color="#A8635A" />
                    {item.calories} kcal
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.is_favorite ? "Remove from favorites" : "Add to favorites"}
              onPress={() => toggleFavorite(item.id)}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={item.is_favorite ? "heart" : "heart-outline"}
                size={22}
                color="#FF8A65"
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              onPress={() => void remove(item)}
              style={styles.favoriteButton}
            >
              <Ionicons name="trash-outline" size={21} color="#A8635A" />
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    gap: 16,
  },
  title: { fontSize: 18, fontWeight: "bold" },
  subtitle: { fontSize: 15, color: "#A8635A" },
  image: { width: 80, height: 80, borderRadius: 12 },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 24 },
  timeContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  favoriteButton: { padding: 8 },
  actions: { alignItems: "center", gap: 4 },
});
