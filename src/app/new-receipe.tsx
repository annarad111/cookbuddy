import { useReceipeStore, Receipe } from "@/store/receipe-store";
import {
  StyleSheet,
  TextInput,
  Pressable,
  Text,
  ScrollView,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import { SafeAreaView } from "react-native-safe-area-context";
import IngridientInput from "@/components/IngriedientsInput";
import ImagePickerInput from "@/components/ImagePickerInput";
import { uploadImage } from "@/lib/supabase";

export default function NewReceipe() {
  const [saving, setSaving] = useState<boolean>(false);
  const [receipe, setReceipe] = useState<Receipe>({
    id: "",
    title: "",
    image_url: "",
    servings: 0,
    time: 0,
    ingredients: [{ id: Crypto.randomUUID(), name: "", amount: "" }],
    steps: "",
    notes: "",
  });
  const addReceipe = useReceipeStore((state) => state.addReceipe);
  const id = Crypto.randomUUID();

  const handleSave = async () => {
    setSaving(true);
    let imageUrl = receipe.image_url;

    if (receipe.image_url && !receipe.image_url.includes("supabase.co")) {
      const uploadedUrl = await uploadImage(receipe.image_url);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        imageUrl = "";
      }
    } else {
      console.log("Error");
    }

    await addReceipe({ ...receipe, image_url: imageUrl });
    setSaving(false);
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={Platform.OS === "web" ? undefined : Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={styles.input}
            value={receipe.title}
            placeholderTextColor="#7c7474"
            onChangeText={(value) =>
              setReceipe({ ...receipe, id: id, title: value })
            }
            placeholder="Receipe name"
          />
          <ImagePickerInput
            image={receipe.image_url ?? ""}
            onChange={(uri) => setReceipe({ ...receipe, image_url: uri })}
          />
          <Text style={styles.title}>Ingredients</Text>
          <View
            style={{
              flexDirection: "row",
              width: "90%",
              margin: "auto",
              gap: 5,
            }}
          >
            <TextInput
              keyboardType="numeric"
              style={styles.rowInput}
              value={receipe.servings === 0 ? "" : String(receipe.servings)}
              onChangeText={(value) =>
                setReceipe({ ...receipe, servings: Number(value) })
              }
              placeholder="Servings"
              placeholderTextColor="#7c7474"
            />

            <TextInput
              keyboardType="numeric"
              style={styles.rowInput}
              value={receipe.time === 0 ? "" : String(receipe.time)}
              onChangeText={(value) =>
                setReceipe({ ...receipe, time: Number(value) || 0 })
              }
              placeholder="Time (min)"
              placeholderTextColor="#7c7474"
            />
          </View>

          <IngridientInput
            ingredients={receipe.ingredients}
            onChange={(ingredients) => setReceipe({ ...receipe, ingredients })}
          />
          <Text style={styles.title}>Steps</Text>
          <TextInput
            style={styles.textarea}
            value={receipe.steps}
            onChangeText={(value) => setReceipe({ ...receipe, steps: value })}
            placeholder="Describe each step..."
            placeholderTextColor="#7c7474"
            multiline
            numberOfLines={5}
          />

          <TextInput
            style={styles.input}
            value={receipe.notes}
            onChangeText={(value) => setReceipe({ ...receipe, notes: value })}
            placeholder="Notes (optional)"
            placeholderTextColor="#7c7474"
          />

          <Pressable style={styles.button} onPress={handleSave}>
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 18 }}>
              {saving ? "Saving..." : "Save Recipe 🥕"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  titleInput: {
    backgroundColor: "white",
    color: "black",
    margin: "auto",
  },
  container: {
    flex: 1,
    backgroundColor: "#FDE2DD",
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
    width: 200,
    margin: "auto",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: "90%",
    margin: "auto",
    marginBottom: 15,
    marginTop: 15,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 40,
    gap: 3,
  },
  textarea: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    width: "90%",
    minHeight: 120,
    textAlignVertical: "top",
    margin: "auto",
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 27,
    marginBottom: 10,
    marginTop: 5,
  },

  rowInput: {
    backgroundColor: "#fffefe",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#ffffff",
    flex: 1,
  },
});