import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useReceipeStore } from "@/store/receipe-store";
import {
  StyleSheet,
  Button,
  View,
  Text,
  Alert,
  Platform,
  TextInput,
  FlatList,
  Pressable
} from "react-native";
import { useState } from "react";
import { Receipe } from "../store/receipe-store";

export default function HomeScreen() {
  const [receipe, setReceipe] = useState<Receipe>({ id: "", title: "" });

  const receipes = useReceipeStore((state) => state.receipes);
  console.log(receipes);
  const addReceipe = useReceipeStore((state) => state.addReceipe);

  return (
    <View>
      <Text>Receipe List</Text>
      <FlatList
        data={receipes}
        keyExtractor={(item) => item.title}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
          </View>
        )}
      />
      <TextInput
        style={styles.titleInput}
        value={receipe.title}
        onChangeText={(value) => setReceipe({ ...receipe, title: value })}
        placeholder="Receipe name"
      />
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => addReceipe(receipe)}
      >
        <Text style={styles.buttonText}>Salvează</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  titleInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
