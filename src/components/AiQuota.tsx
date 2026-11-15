import { useEffect } from "react";
import { Text, View } from "react-native";
import { refreshAiQuota, useAiQuota } from "@/lib/cooking-ai";

/** "✨ 14 of 20 AI requests left today", shown next to AI buttons. */
export default function AiQuota() {
  const remaining = useAiQuota((s) => s.remaining);
  useEffect(() => {
    void refreshAiQuota().catch(() => {});
  }, []);
  if (remaining == null) return null;
  const low = remaining <= 3;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: low ? "#fde2dd" : "#f6eadf",
      }}
    >
      <Text
        style={{ color: low ? "#8c422d" : "#6b4133", fontWeight: "600", fontSize: 13 }}
      >
        ✨ {remaining} of 20 AI requests left today
      </Text>
    </View>
  );
}
