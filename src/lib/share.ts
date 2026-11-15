import { Linking, Platform, Share } from "react-native";
import { formatRecipeText, type Recipe } from "@/domain/cooking";
import { notify, showDialog } from "@/store/overlay-store";

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
      return "Copied to the clipboard.";
    }
    throw new Error("This browser can't share. Copy the text manually.");
  }
  await Share.share({ message });
  return "";
}

/**
 * Lets the user pick how to share a recipe: straight to WhatsApp, or the
 * device share sheet (copy to clipboard on desktop browsers).
 */
export async function shareRecipe(recipe: Recipe, servings?: number) {
  const text = formatRecipeText(recipe, servings);
  const choice = await showDialog({
    title: `Share "${recipe.title}"`,
    message: "Send the recipe with its ingredients and steps.",
    mood: "hello",
    buttons: [
      { label: "WhatsApp", value: "whatsapp", primary: true },
      {
        label: Platform.OS === "web" ? "Other apps / copy" : "Other apps",
        value: "other",
      },
    ],
  });
  try {
    if (choice === "whatsapp")
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    else if (choice === "other") notify(await shareText(text));
  } catch {
    notify("Couldn't open sharing on this device.", "idle");
  }
}
