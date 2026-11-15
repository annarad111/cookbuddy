import { Image } from "expo-image";
import { Text, View } from "react-native";

// Small animated WebPs (240 px tall), converted from the original GIFs.
const SOURCES = {
  loading: require("../../assets/animations/bunny/loading.webp"),
  munch: require("../../assets/animations/bunny/munch.webp"),
  hello: require("../../assets/animations/bunny/hello.webp"),
  success: require("../../assets/animations/bunny/success.webp"),
  idle: require("../../assets/animations/bunny/idle.webp"),
};
export type BunnyMood = keyof typeof SOURCES;

/** The CookBuddy bunny. Animated on web, iOS and Android via expo-image. */
export default function Bunny({
  mood = "idle",
  size = 120,
}: {
  mood?: BunnyMood;
  size?: number;
}) {
  return (
    <Image
      source={SOURCES[mood]}
      style={{ width: size * (448 / 480), height: size }}
      contentFit="contain"
      autoplay
      accessibilityIgnoresInvertColors
      accessible={false}
    />
  );
}

/** Centered loading bunny with an optional caption. */
export function BunnyLoader({
  label,
  size = 90,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label || "Loading"}
      style={{ alignItems: "center", gap: 4, paddingVertical: 6 }}
    >
      <Bunny mood="loading" size={size} />
      {!!label && (
        <Text style={{ color: "#86756b", fontSize: 14 }}>{label}</Text>
      )}
    </View>
  );
}
