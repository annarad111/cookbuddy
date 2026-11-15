import { create } from "zustand";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { showDialog } from "@/store/overlay-store";
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
  recipeMealType,
} from "@/domain/cooking";
export type AIContext = {
  preferences: Preferences;
  recipes: Recipe[];
  pantry: PantryItem[];
  feedback: Feedback[];
};
/** AI requests left today for this account (null until known). */
export const useAiQuota = create<{ remaining: number | null }>(() => ({
  remaining: null,
}));
export async function refreshAiQuota() {
  const { data, error } = await supabase.rpc("cookbuddy_ai_remaining");
  // Missing migration: keep the counter hidden rather than showing a wrong number.
  useAiQuota.setState({ remaining: error || typeof data !== "number" ? null : data });
}
async function showLimitReached() {
  useAiQuota.setState({ remaining: 0 });
  const choice = await showDialog({
    title: "Out of AI ideas for today",
    message:
      "You've used all 20 AI requests for today. They come back tomorrow. Until then you can still plan from your saved recipes, without AI.",
    mood: "idle",
    buttons: [
      { label: "OK", value: "ok" },
      { label: "Plan without AI", value: "plan", primary: true },
    ],
  });
  if (choice === "plan") router.navigate("/planner");
}
async function invoke(payload: object): Promise<unknown> {
  try {
    return await callFunction(payload);
  } finally {
    void refreshAiQuota().catch(() => {});
  }
}
async function callFunction(payload: object): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("cooking-ai", {
    body: payload,
  });
  if (error) {
    // A function that is not deployed answers 404 without CORS headers, so the
    // browser reports it as a network failure (FunctionsFetchError).
    if (error.name === "FunctionsFetchError")
      throw new Error(
        "Can't reach the AI function. Check your internet connection and that the \"cooking-ai\" function is deployed in Supabase (Edge Functions).",
      );
    let message =
      "AI is not available. You can use your saved recipes or try again later.";
    try {
      const response = await error.context?.json();
      if (response?.code === "AI_LIMIT") {
        void showLimitReached();
        throw new Error("Daily AI limit reached. Try again tomorrow.");
      }
      if (response?.error) message = response.error;
      else if (error.context?.status === 404)
        message =
          "The \"cooking-ai\" function is not deployed in Supabase. See step 3 in START_HERE_RO.md.";
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Daily AI limit")) throw e;
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
              (recipeMealType(r) === entry.meal || recipeMealType(r) === "any") &&
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
      "The suggestion contains an excluded ingredient. Please try again.",
    );
  if (recipe.time > context.preferences.maxMinutes)
    throw new Error("The suggestion exceeds the chosen time.");
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
/** AI estimate of kcal per portion for a recipe (uses one AI request from the daily quota). */
export async function estimateCaloriesAI(
  recipe: Pick<Recipe, "title" | "servings" | "ingredients">,
): Promise<{ calories: number; note: string }> {
  const data = (await invoke({
    action: "calories",
    recipe: {
      title: recipe.title,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map(({ name, quantity, unit, amount }) => ({
        name,
        quantity,
        unit,
        amount,
      })),
    },
  })) as { calories?: unknown; note?: unknown };
  const calories = Number(data?.calories);
  if (!Number.isInteger(calories) || calories < 1 || calories > 5000)
    throw new Error("The calorie estimate is not valid. Please try again.");
  return {
    calories,
    note: typeof data.note === "string" ? data.note : "",
  };
}
