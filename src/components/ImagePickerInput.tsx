import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  DimensionValue,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  image: string;
  width?: DimensionValue;
  onChange: (uri: string) => void;
};

export default function ImagePickerInput({ image, onChange, width = '85%' }: Props) {
  const pickImage = async () => {
    const permission =
      Platform.OS === "web"
        ? { granted: true }
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permisiune necesară",
        "Trebuie să permiți accesul la galerie.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      onChange(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity style={[styles.container, { width }]} onPress={pickImage}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <>
          <Ionicons name="image-outline" size={32} color="#B5A9A5" />
          <Text style={styles.title}>Adaugă o fotografie</Text>
          <Text style={styles.subtitle}>
            sau <Text style={styles.link}>alege din fișiere</Text>
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D9A79C",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    margin: 'auto'
  },
  title: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "500",
    color: "#4A3F3C",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "#8C7D78",
  },
  link: {
    textDecorationLine: "underline",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
