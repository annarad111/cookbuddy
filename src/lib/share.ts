import { Platform, Share } from "react-native";

/**
 * Shares text with the system sheet. On web browsers without the Web Share API
 * (most desktop browsers), copies the text to the clipboard instead.
 * Returns a short status message for the UI.
 */
export async function shareText(message: string): Promise<string> {
  if (Platform.OS === "web") {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) {
      try {
        await nav.share({ text: message });
        return "";
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return "";
      }
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(message);
      return "Textul a fost copiat în clipboard.";
    }
    throw new Error("Browserul nu permite distribuirea. Copiază textul manual.");
  }
  await Share.share({ message });
  return "";
}
