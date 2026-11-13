import { supabase } from "./supabase";
import {
  Feedback,
  PantryItem,
  Preferences,
  Recipe,
  validateRecipe,
  validatePlan,
  Meal,
  excludedRecipe,
  normalize,
} from "@/domain/cooking";
export type AIContext = {
  preferences: Preferences;
  recipes: Recipe[];
  pantry: PantryItem[];
  feedback: Feedback[];
};
async function invoke(payload: object): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("cooking-ai", {
    body: payload,
  });
  if (error) {
    // A function that is not deployed answers 404 without CORS headers, so the
    // browser reports it as a network failure (FunctionsFetchError).
    if (error.name === "FunctionsFetchError")
      throw new Error(
        "Nu pot contacta funcția AI. Verifică internetul și că funcția „cooking-ai” este publicată în Supabase (Edge Functions).",
      );
    let message =
      "AI-ul nu este disponibil. Poți folosi rețetele salvate sau încerca mai târziu.";
    try {
      const response = await error.context?.json();
      if (response?.error) message = response.error;
      else if (error.context?.status === 404)
        message =
          "Funcția AI „cooking-ai” nu este publicată în Supabase. Vezi pasul 3 din START_HERE_RO.md.";
    } catch {
      /* No JSON body in the response. */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function generatePlan(context: AIContext) {
  const plan = validatePlan(
    await invoke({ action: "plan", ...context }),
    context.preferences,
  );
  const canonical = new Map<string, Recipe>();
  return plan.map((entry) => {
    // Preserve saved recipe quantities and identity when the model selects a known dish.
    const saved =
      context.preferences.source !== "new"
        ? context.recipes.find(
            (r) =>
              normalize(r.title) === normalize(entry.recipe.title) &&
              (r.meal_type === entry.meal || r.meal_type === "any") &&
              r.time <= context.preferences.maxMinutes &&
              !excludedRecipe(r, context.preferences.excluded),
          )
        : undefined;
    const key = JSON.stringify({
      title: entry.recipe.title,
      servings: entry.recipe.servings,
      time: entry.recipe.time,
      ingredients: entry.recipe.ingredients.map(({ name, quantity, unit }) => ({
        name,
        quantity,
        unit,
      })),
      steps: entry.recipe.steps,
    });
    const recipe = saved || canonical.get(key) || entry.recipe;
    canonical.set(key, recipe);
    return { ...entry, recipe };
  });
}
export async function suggestRecipe(
  context: AIContext,
  meal: Meal,
  previousTitle?: string,
): Promise<Recipe> {
  const recipe = validateRecipe(
    await invoke({ action: "suggest", ...context, meal, previousTitle }),
    `ai-${Date.now()}`,
  );
  if (excludedRecipe(recipe, context.preferences.excluded))
    throw new Error(
      "Propunerea conține un ingredient exclus. Încearcă din nou.",
    );
  if (recipe.time > context.preferences.maxMinutes)
    throw new Error("Propunerea depășește timpul ales.");
  return { ...recipe, meal_type: meal };
}
export async function importRecipe(
  text: string,
  image?: string,
): Promise<Recipe> {
  return validateRecipe(
    await invoke({ action: "import", text, image }),
    `import-${Date.now()}`,
  );
}
