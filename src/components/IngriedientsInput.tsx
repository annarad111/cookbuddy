import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as Crypto from "expo-crypto";
import { Ingredient } from "@/store/receipe-store";

type Props = {
  ingredients: Ingredient[];
  onChange: (ingredients: Ingredient[]) => void;
};

export default function IngridientInput({ ingredients, onChange }: Props) {
  const addIngredients = () =>
    onChange([
      ...ingredients,
      { id: Crypto.randomUUID(), name: "", amount: "" },
    ]);

  const removeIngredients = (id: string) => {
    onChange(ingredients.filter((item) => item.id !== id));
  };

  const updateIngredients = (
    id: string,
    field: "name" | "amount",
    value: string,
  ) => {
    onChange(
      ingredients.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };
  return (
    <View style={styles.container}>
      {ingredients.map((item) => (
        <View style={styles.row} key={item.id}>
          <TextInput
            style={styles.input}
            placeholder="Ingredients"
            placeholderTextColor="#7c7474"
            value={item.name}
            onChangeText={(text) => updateIngredients(item.id, "name", text)}
          ></TextInput>
          <TextInput
            key={item.id}
            style={styles.input}
            placeholder="Amount"
            placeholderTextColor="#7c7474"
            value={item.amount}
            onChangeText={(text) => updateIngredients(item.id, "amount", text)}
          ></TextInput>
          <View>
            <TouchableOpacity onPress={() => removeIngredients(item.id)}>
              <Text style={{ color: "red" }}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={addIngredients}>
              <Text style={{ color: "blue", fontSize: 30 }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    justifyContent: "space-around",
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
    width: 130,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
});
