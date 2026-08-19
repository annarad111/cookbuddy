import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  image: string;
  onChange: (uri: string) => void;
};

export default function ImagePickerInput({ image, onChange }: Props) {
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permisiune necesară",
        "Trebuie să permiți accesul la galerie.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      onChange(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={pickImage}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <>
          <Ionicons name="image-outline" size={32} color="#B5A9A5" />
          <Text style={styles.title}>Add a photo</Text>
          <Text style={styles.subtitle}>
            or <Text style={styles.link}>browse files</Text>
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "85%",
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
