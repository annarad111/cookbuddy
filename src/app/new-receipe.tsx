import { useReceipeStore, Receipe } from "@/store/receipe-store";
import {
  StyleSheet,
  TextInput,
  Pressable,
  Text,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import { SafeAreaView } from "react-native-safe-area-context";
import IngridientInput from "@/components/IngriedientsInput";

export default function NewReceipe() {
  const [receipe, setReceipe] = useState<Receipe>({
    id: "",
    title: "",
    image: "",
    servings: 0,
    ingredients: [{ id: Crypto.randomUUID(), name: "", amount: "" }],
  });
  const addReceipe = useReceipeStore((state) => state.addReceipe);
  const id = Crypto.randomUUID();

  const handleSave = () => {
    addReceipe(receipe);
    router.back();
  };

  return (
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
        <TextInput
          style={styles.input}
          value={receipe.image}
          onChangeText={(value) => setReceipe({ ...receipe, image: value })}
          placeholder="Image"
          placeholderTextColor="#7c7474"
        />
        <TextInput
          keyboardType="numeric"
          style={styles.input}
          value={receipe.servings}
          onChangeText={(value) =>
            setReceipe({ ...receipe, servings: Number(value) })
          }
          placeholder="Servings"
          placeholderTextColor="#7c7474"
        />

        <IngridientInput ingredients={receipe.ingredients} onChange={(ingredients) => setReceipe({...receipe, ingredients})}/>
        <Pressable style={styles.button} onPress={handleSave}>
          <Text>Add ..</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  titleInput: {
    backgroundColor: "white",
    color: "black",
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
    width: 300,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 40,
    alignItems: "center",
    gap: 3,
  },
});
