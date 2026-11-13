import { useState } from "react";
import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Recipe } from "@/domain/cooking";
import { importRecipe } from "@/lib/cooking-ai";
import { uploadImage } from "@/lib/supabase";
import { useReceipeStore } from "@/store/receipe-store";
import {
  Action,
  Card,
  Copy,
  Field,
  Page,
  Title,
  useTask,
} from "@/components/KitchenUI";
import RecipeEditor from "@/components/RecipeEditor";
export default function ImportRecipe() {
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [draft, setDraft] = useState<Recipe | null>(null);
  const task = useTask();
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.65,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64 || asset.base64.length > 7_000_000)
      throw new Error("Choose a JPG/PNG/WebP photo under 5 MB.");
    const mime = asset.mimeType || "image/jpeg";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
      throw new Error("Choose a JPG, PNG or WebP photo.");
    setImage(`data:${mime};base64,${asset.base64}`);
  }
  if (draft)
    return (
      <RecipeEditor
        initial={draft}
        onSave={async (recipe) => {
          let image_url = recipe.image_url;
          if (image_url && !image_url.startsWith("https://")) {
            const url = await uploadImage(image_url);
            if (!url) throw new Error("Photo upload failed.");
            image_url = url;
          }
          await useReceipeStore.getState().addReceipe({ ...recipe, image_url });
          router.back();
        }}
      />
    );
  return (
    <Page>
      <Title>Add a recipe from text or a photo</Title>
      <Copy>
        Paste a recipe or pick a photo of the ingredients and steps. The AI prepares it for your collection; you review it before saving.
      </Copy>
      <Card>
        <Field
          label="Recipe text"
          value={text}
          onChangeText={setText}
          multiline
        />
        <Action
          secondary
          label="Choose a recipe photo"
          disabled={task.busy}
          onPress={() => task.run(pick)}
        />
        {!!image && (
          <>
            <Image
              source={{ uri: image }}
              style={{ height: 200, width: "100%", resizeMode: "contain" }}
            />
            <Action
              secondary
              label="Remove photo"
              onPress={() => setImage("")}
            />
          </>
        )}
        <Copy>
          The text or photo is sent to OpenRouter for processing. Photo import depends on a free model with image support being available.
        </Copy>
        <Action
          label="Prepare recipe with AI ✨"
          disabled={task.busy || (!text.trim() && !image)}
          onPress={() =>
            task.run(async () => {
              setDraft(await importRecipe(text, image || undefined));
            })
          }
        />
        {task.status}
      </Card>
    </Page>
  );
}
