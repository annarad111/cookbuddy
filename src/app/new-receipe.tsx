import { router, useLocalSearchParams } from "expo-router";
import RecipeEditor from "@/components/RecipeEditor";
import { Copy, Page } from "@/components/KitchenUI";
import { useReceipeStore } from "@/store/receipe-store";
import { uploadImage } from "@/lib/supabase";
export default function NewRecipe() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { receipes, addReceipe, updateReceipe } = useReceipeStore();
  const initial = edit ? receipes.find((r) => r.id === edit) : undefined;
  if (edit && !initial)
    return (
      <Page>
        <Copy>
          Rețeta nu este încărcată. Revino la registru și actualizează lista.
        </Copy>
      </Page>
    );
  return (
    <RecipeEditor
      key={edit || "new"}
      initial={initial}
      onSave={async (recipe) => {
        let image_url = recipe.image_url;
        if (image_url && !image_url.startsWith("https://")) {
          const url = await uploadImage(image_url);
          if (!url)
            throw new Error(
              "Fotografia nu a putut fi încărcată. Încearcă din nou.",
            );
          image_url = url;
        }
        if (edit) await updateReceipe(edit, { ...recipe, image_url });
        else await addReceipe({ ...recipe, image_url });
        router.back();
      }}
    />
  );
}
