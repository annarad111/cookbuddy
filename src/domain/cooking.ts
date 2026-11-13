export const MEALS = ["breakfast", "lunch", "dinner"] as const;
export type Meal = (typeof MEALS)[number];
export const mealLabels: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};
export type Ingredient = {
  id: string;
  name: string;
  amount: string;
  quantity?: number | null;
  unit?: string;
};
export type Recipe = {
  id: string;
  user_id?: string;
  household_id?: string | null;
  title: string;
  image_url?: string;
  servings: number;
  time: number;
  ingredients: Ingredient[];
  steps: string;
  notes?: string;
  is_favorite?: boolean;
  meal_type?: Meal | "any";
  /** Estimated kcal per portion; null/undefined when unknown. */
  calories?: number | null;
};
export type PlanEntry = {
  id: string;
  day: number;
  meal: Meal;
  servings: number;
  recipe: Recipe;
};
export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};
export type Feedback = {
  id: string;
  recipeId: string;
  title: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};
export type Preferences = {
  people: number;
  days: number;
  maxMinutes: number;
  preferences: string;
  excluded: string;
  repeatMeals: boolean;
  source: "mixed" | "saved" | "new";
};
export type KitchenState = {
  preferences: Preferences;
  plan: PlanEntry[];
  pantry: PantryItem[];
  checked: string[];
  feedback: Feedback[];
  planCreatedAt?: string;
};
export const defaultKitchen = (): KitchenState => ({
  preferences: {
    people: 2,
    days: 3,
    maxMinutes: 40,
    preferences: "",
    excluded: "",
    repeatMeals: true,
    source: "mixed",
  },
  plan: [],
  pantry: [],
  checked: [],
  feedback: [],
});
export const normalize = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
export function canonicalUnit(s: string): string {
  const unit = normalize(s).replace(/\.$/, "");
  return (
    (
      {
        gr: "g",
        gram: "g",
        grame: "g",
        grams: "g",
        kilogram: "kg",
        kilograme: "kg",
        kilograms: "kg",
        litru: "l",
        litri: "l",
        liter: "l",
        liters: "l",
        litre: "l",
        litres: "l",
        // Pieces, spoons and cups: Romanian names from older recipes map to English.
        buc: "pcs",
        bucati: "pcs",
        bucata: "pcs",
        pc: "pcs",
        piece: "pcs",
        pieces: "pcs",
        linguri: "tbsp",
        lingura: "tbsp",
        tablespoon: "tbsp",
        tablespoons: "tbsp",
        lingurite: "tsp",
        lingurita: "tsp",
        teaspoon: "tsp",
        teaspoons: "tsp",
        cana: "cup",
        cani: "cup",
        cups: "cup",
        ounce: "oz",
        ounces: "oz",
        pound: "lb",
        pounds: "lb",
        lbs: "lb",
      } as Record<string, string>
    )[unit] ?? unit
  );
}
/** The only units the app shows and stores: metric plus pieces. */
export const METRIC_UNITS = ["g", "kg", "ml", "l", "pcs"] as const;
// Non-metric units (from imports, older recipes or AI) are converted on the way in.
const TO_METRIC: Record<string, { factor: number; unit: string }> = {
  tbsp: { factor: 15, unit: "ml" },
  tsp: { factor: 5, unit: "ml" },
  cup: { factor: 240, unit: "ml" },
  cl: { factor: 10, unit: "ml" },
  dl: { factor: 100, unit: "ml" },
  oz: { factor: 28.35, unit: "g" },
  lb: { factor: 453.6, unit: "g" },
  mg: { factor: 0.001, unit: "g" },
};
/** Converts spoons, cups, oz, lb… to g/ml; other units are returned canonicalised. */
export function toMetric(
  quantity: number,
  unit: string,
): { quantity: number; unit: string } {
  const u = canonicalUnit(unit);
  const c = TO_METRIC[u];
  if (!c) return { quantity, unit: u };
  // Whole grams/millilitres read better than 28.35 g; keep decimals for tiny amounts.
  const q = quantity * c.factor;
  return { quantity: q >= 10 ? Math.round(q) : Math.round(q * 10) / 10, unit: c.unit };
}
export function ingredientQuantity(
  i: Ingredient,
): { quantity: number; unit: string } | null {
  if (
    typeof i.quantity === "number" &&
    Number.isFinite(i.quantity) &&
    i.quantity > 0
  )
    return toMetric(i.quantity, i.unit || "pcs");
  const m = i.amount?.trim().match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([^\d]*)$/);
  if (!m) return null;
  const quantity = m[1].includes("/")
    ? Number(m[1].split("/")[0]) / Number(m[1].split("/")[1])
    : Number(m[1].replace(",", "."));
  const q = toMetric(quantity, m[2] || "pcs");
  return Number.isFinite(q.quantity) &&
    q.quantity > 0 &&
    (METRIC_UNITS as readonly string[]).includes(q.unit)
    ? q
    : null;
}
export function baseQuantity(
  quantity: number,
  unit: string,
): { quantity: number; unit: string } {
  const q = toMetric(quantity, unit);
  if (q.unit === "kg") return { quantity: q.quantity * 1000, unit: "g" };
  if (q.unit === "l") return { quantity: q.quantity * 1000, unit: "ml" };
  return q;
}
export function formatQuantity(quantity: number, unit: string): string {
  return `${Math.round((quantity + Number.EPSILON) * 100) / 100} ${unit}`;
}
export function scaledIngredient(
  i: Ingredient,
  servings: number,
  baseServings: number,
): string {
  const q = ingredientQuantity(i);
  if (!q || !(baseServings > 0))
    return `${i.amount || "to taste"} (check manually)`;
  return formatQuantity((q.quantity * servings) / baseServings, q.unit);
}
export type ShoppingItem = {
  key: string;
  name: string;
  quantity: number | null;
  unit: string;
  manual?: string;
  recipes: string[];
};
export function shoppingList(
  plan: PlanEntry[],
  pantry: PantryItem[],
): ShoppingItem[] {
  const items = new Map<string, ShoppingItem>();
  for (const entry of plan)
    for (const i of entry.recipe.ingredients) {
      const parsed = ingredientQuantity(i);
      const q =
        parsed && entry.recipe.servings > 0
          ? baseQuantity(
              (parsed.quantity * entry.servings) / entry.recipe.servings,
              parsed.unit,
            )
          : null;
      // Unstructured quantities stay separate: never guess how much "a pinch" weighs.
      const key = q
        ? `${normalize(i.name)}|${q.unit}`
        : `manual|${entry.id}|${i.id}`;
      const existing = items.get(key);
      if (existing && q) {
        existing.quantity! += q.quantity;
        if (!existing.recipes.includes(entry.recipe.title))
          existing.recipes.push(entry.recipe.title);
      } else
        items.set(key, {
          key,
          name: i.name,
          quantity: q?.quantity ?? null,
          unit: q?.unit ?? "",
          manual: q ? undefined : i.amount,
          recipes: [entry.recipe.title],
        });
    }
  for (const p of pantry) {
    const q = baseQuantity(p.quantity, p.unit);
    const item = items.get(`${normalize(p.name)}|${q.unit}`);
    if (item && item.quantity !== null)
      item.quantity = Math.max(0, item.quantity - q.quantity);
  }
  return [...items.values()]
    .filter((i) => i.quantity === null || i.quantity > 0.0001)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}
export function excludedRecipe(recipe: Recipe, excluded: string): boolean {
  const terms = excluded
    .split(/[,;\n]/)
    .map(normalize)
    .filter(Boolean);
  return terms.some(
    (term) =>
      normalize(recipe.title).includes(term) ||
      recipe.ingredients.some((i) => normalize(i.name).includes(term)),
  );
}
export function localPlan(recipes: Recipe[], p: Preferences): PlanEntry[] {
  const result: PlanEntry[] = [];
  for (let day = 1; day <= p.days; day++)
    for (const meal of MEALS) {
      const options = recipes.filter(
        (r) =>
          (r.meal_type === meal || r.meal_type === "any") &&
          r.time <= p.maxMinutes &&
          !excludedRecipe(r, p.excluded),
      );
      if (!options.length)
        throw new Error(
          `No eligible recipes for ${mealLabels[meal].toLowerCase()}. Set the meal type of your recipes or use AI.`,
        );
      const recipe = options[(p.repeatMeals ? 0 : day - 1) % options.length];
      result.push({
        id: `${day}-${meal}`,
        day,
        meal,
        servings: p.people,
        recipe,
      });
    }
  return result;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid AI response. Please try again.");
  return value as Record<string, unknown>;
}
function str(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("Missing or too long text in the AI response.");
  return value.trim();
}
function num(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error("Invalid quantity or duration in the AI response.");
  return value;
}
export function validateRecipe(value: unknown, id: string): Recipe {
  const r = object(value);
  if (
    !Array.isArray(r.ingredients) ||
    r.ingredients.length < 1 ||
    r.ingredients.length > 50
  )
    throw new Error("The AI ingredient list is invalid.");
  if (!Number.isInteger(r.servings) || !Number.isInteger(r.time)) throw new Error('Servings and time must be whole numbers.');
  const meal = MEALS.includes(r.meal_type as Meal)
    ? (r.meal_type as Meal)
    : "any";
  return {
    id,
    title: str(r.title, 160),
    servings: num(r.servings, 1, 100),
    time: num(r.time, 1, 1440),
    meal_type: meal,
    ingredients: r.ingredients.map((value, index) => {
      const i = object(value);
      const raw = num(i.quantity, 0, 100000);
      // Store metric only: "2 tbsp" from the AI becomes "30 ml".
      const metric = raw > 0 ? toMetric(raw, str(i.unit, 30)) : null;
      const quantity = metric?.quantity ?? 0;
      const unit = metric?.unit ?? str(i.unit, 30);
      return {
        id: `${id}-i${index}`,
        name: str(i.name, 160),
        quantity: quantity || null,
        unit,
        amount: quantity > 0 ? formatQuantity(quantity, unit) : "to taste",
      };
    }),
    steps: str(r.steps, 16000),
    notes: typeof r.notes === "string" ? r.notes.slice(0, 4000) : "",
    // Optional estimate; anything outside a sane range is dropped rather than rejected.
    calories:
      typeof r.calories === "number" &&
      Number.isFinite(r.calories) &&
      r.calories > 0 &&
      r.calories <= 5000
        ? Math.round(r.calories)
        : null,
  };
}
export function validatePlan(value: unknown, p: Preferences): PlanEntry[] {
  const data = object(value);
  if (!Array.isArray(data.meals) || data.meals.length !== p.days * 3)
    throw new Error(
      "The AI did not return every meal. Your previous plan was kept.",
    );
  const keys = new Set<string>();
  return data.meals.map((value) => {
    const m = object(value);
    const day = num(m.day, 1, p.days);
    const meal = m.meal as Meal;
    if (!Number.isInteger(day) || !MEALS.includes(meal))
      throw new Error("Invalid day or meal type.");
    const key = `${day}-${meal}`;
    if (keys.has(key)) throw new Error("The AI repeated a meal slot.");
    keys.add(key);
    const recipe = validateRecipe(m.recipe, `ai-${key}`);
    if (excludedRecipe(recipe, p.excluded))
      throw new Error(
        "A suggestion contains an excluded ingredient. Please try again.",
      );
    if (recipe.time > p.maxMinutes)
      throw new Error("A recipe exceeds the chosen time. Please try again.");
    recipe.meal_type = meal;
    return { id: key, day, meal, servings: p.people, recipe };
  });
}
