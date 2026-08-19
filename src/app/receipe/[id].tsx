import { useLocalSearchParams } from "expo-router";
import { Receipe, useReceipeStore } from "@/store/receipe-store";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import ImagePickerInput from "@/components/ImagePickerInput";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ReceipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toggleFavorite = useReceipeStore((state) => state.toggleFavorite);
  const removeReceipe = useReceipeStore((state) => state.removeReceipe);
  const receipe = useReceipeStore((state) =>
    state.receipes.find((item) => item.id === id),
  );
  const updateReceipe = useReceipeStore((state) => state.updateReceipe);

  if (!receipe) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Rețeta nu a fost găsită</Text>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete recipe",
      "Are you sure you want to delete this recipe? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeReceipe(receipe.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 15,
          }}
        >
          <Link href="/" asChild>
            <Pressable
              style={{
                backgroundColor: "#ffffff91",
                padding: 10,
                borderRadius: 100,
              }}
            >
              <Ionicons name="chevron-back-outline" size={24} color="#3A3A3A" />
            </Pressable>
          </Link>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={handleDelete} style={styles.favoriteButton}>
              <Ionicons name="trash-outline" size={22} color="#E24B4A" />
            </Pressable>
            <Pressable
              onPress={() => toggleFavorite(receipe.id)}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={receipe.is_favorite ? "heart" : "heart-outline"}
                size={22}
                color="#FF8A65"
              />
            </Pressable>
          </View>
        </View>

        <ImagePickerInput
          image={receipe.image_url ?? ""}
          width={"100%"}
          onChange={(uri) => updateReceipe(receipe.id, { image_url: uri })}
        />
        <View style={styles.detailsContainer}>
          <Text style={styles.title}>{receipe.title}</Text>
          <Text>
            A cozy weeknight classic, ready in under {receipe.time} minutes.
          </Text>
          <View style={styles.timeContainer}>
            <Text style={styles.timeBox}>Servings: {receipe.servings}</Text>
            <Text style={styles.timeBox}>Time: {receipe.time}</Text>
          </View>

          <Text>
            <Text style={styles.subTitle}>Ingredients:</Text>

            {receipe.ingredients.map((item) => (
              <View key={item.id} style={styles.ingredients}>
                <Text style={styles.ingredient}>{item.name}</Text>
                <Text style={styles.ingredient}>{item.amount}</Text>
              </View>
            ))}
          </Text>
          <View style={styles.steps}>
            <Text style={styles.subTitle}>Steps</Text>
            {receipe.steps
              .split("\n")
              .filter((step) => step.trim() !== "")
              .map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
          </View>

          <View style={styles.steps}>
            <Text style={styles.subTitle}>Notes </Text>
            <Text
              style={{
                backgroundColor: "#FBDCD5",
                fontFamily: "Nunito_400Regular",
                padding: 8,
                borderRadius: 10,
              }}
            >
              {receipe.notes}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FBDCD5" },
  title: { fontSize: 30, fontWeight: "bold", fontFamily: "Baloo2_700Bold" },
  subTitle: { fontSize: 20, fontWeight: "bold", fontFamily: "Baloo2_700Bold" },
  scrollContent: {
    flexGrow: 1,
    gap: 3,
  },
  detailsContainer: {
    paddingLeft: 30,
    paddingRight: 30,
    paddingTop: 50,
    backgroundColor: "white",
    width: "100%",
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  timeContainer: {
    flexDirection: "row",
  },
  timeBox: {
    backgroundColor: "#FDEAE6",
    padding: 20,
    borderRadius: 24,
    flexDirection: "column",
  },
  ingredients: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FBDCD5",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  ingredient: {},
  steps: {
    display: "flex",
    gap: 10,
    marginTop: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FF8A65",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: "#3A3A3A",
    lineHeight: 22,
  },
  favoriteButton: {
    padding: 11,
    backgroundColor: "#ffffff91",
    borderRadius: 100,
  },
});
