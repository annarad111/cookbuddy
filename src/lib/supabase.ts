import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const uploadImage = async (uri: string): Promise<string | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    let arrayBuffer: ArrayBuffer;
    let contentType = "image/jpeg";
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      contentType = blob.type || contentType;
      arrayBuffer = await blob.arrayBuffer();
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      arrayBuffer = decode(base64);
    }
    if (arrayBuffer.byteLength > 5 * 1024 * 1024)
      throw new Error("Imaginea depășește 5 MB.");
    const extension =
      contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : "jpg";
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, arrayBuffer, { contentType });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
};
