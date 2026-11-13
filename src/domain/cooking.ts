export const MEALS = ["breakfast", "lunch", "dinner"] as const;
export type Meal = (typeof MEALS)[number];
export const mealLabels: Record<Meal, string> = {
  breakfast: "Mic dejun",
  lunch: "Prânz",
  dinner: "Cină",
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
        litru: "l",
        litri: "l",
        bucati: "buc",
        bucata: "buc",
        pcs: "buc",
        piece: "buc",
        pieces: "buc",
        linguri: "lingură",
        lingura: "lingură",
        tbsp: "lingură",
        lingurite: "linguriță",
        lingurita: "linguriță",
        tsp: "linguriță",
      } as Record<string, string>
    )[unit] ?? unit
  );
}
const units = new Set([
  "g",
  "kg",
  "ml",
  "l",
  "buc",
  "lingură",
  "linguriță",
  "cană",
  "cana",
  "cup",
  "cl",
  "mg",
]);
export function ingredientQuantity(
  i: Ingredient,
): { quantity: number; unit: string } | null {
  if (
    typeof i.quantity === "number" &&
    Number.isFinite(i.quantity) &&
    i.quantity > 0
  )
    return { quantity: i.quantity, unit: canonicalUnit(i.unit || "buc") };
  const m = i.amount?.trim().match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([^\d]*)$/);
  if (!m) return null;
  const quantity = m[1].includes("/")
    ? Number(m[1].split("/")[0]) / Number(m[1].split("/")[1])
    : Number(m[1].replace(",", "."));
  const unit = canonicalUnit(m[2] || "buc");
  return Number.isFinite(quantity) && quantity > 0 && units.has(unit)
    ? { quantity, unit }
    : null;
}
export function baseQuantity(
  quantity: number,
  unit: string,
): { quantity: number; unit: string } {
  unit = canonicalUnit(unit);
  if (unit === "kg") return { quantity: quantity * 1000, unit: "g" };
  if (unit === "l") return { quantity: quantity * 1000, unit: "ml" };
  return { quantity, unit };
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
    return `${i.amount || "după gust"} (verifică manual)`;
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
    .sort((a, b) => a.name.localeCompare(b.name, "ro"));
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
          `Nu ai rețete eligibile pentru ${mealLabels[meal].toLowerCase()}. Alege categoria rețetelor sau folosește AI.`,
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
    throw new Error("Răspuns AI invalid. Încearcă din nou.");
  return value as Record<string, unknown>;
}
function str(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("Text lipsă sau prea lung în răspunsul AI.");
  return value.trim();
}
function num(value: unknown, min: number, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error("Cantitate sau durată invalidă în răspunsul AI.");
  return value;
}
export function validateRecipe(value: unknown, id: string): Recipe {
  const r = object(value);
  if (
    !Array.isArray(r.ingredients) ||
    r.ingredients.length < 1 ||
    r.ingredients.length > 50
  )
    throw new Error("Lista de ingrediente AI este invalidă.");
  if (!Number.isInteger(r.servings) || !Number.isInteger(r.time)) throw new Error('Porțiile și durata trebuie să fie numere întregi.');
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
      const quantity = num(i.quantity, 0, 100000);
      const unit = str(i.unit, 30);
      return {
        id: `${id}-i${index}`,
        name: str(i.name, 160),
        quantity: quantity || null,
        unit,
        amount: quantity > 0 ? formatQuantity(quantity, unit) : "după gust",
      };
    }),
    steps: str(r.steps, 16000),
    notes: typeof r.notes === "string" ? r.notes.slice(0, 4000) : "",
  };
}
export function validatePlan(value: unknown, p: Preferences): PlanEntry[] {
  const data = object(value);
  if (!Array.isArray(data.meals) || data.meals.length !== p.days * 3)
    throw new Error(
      "AI-ul nu a returnat toate mesele. Planul anterior a fost păstrat.",
    );
  const keys = new Set<string>();
  return data.meals.map((value) => {
    const m = object(value);
    const day = num(m.day, 1, p.days);
    const meal = m.meal as Meal;
    if (!Number.isInteger(day) || !MEALS.includes(meal))
      throw new Error("Zi sau tip de masă invalid.");
    const key = `${day}-${meal}`;
    if (keys.has(key)) throw new Error("AI-ul a repetat un interval de masă.");
    keys.add(key);
    const recipe = validateRecipe(m.recipe, `ai-${key}`);
    if (excludedRecipe(recipe, p.excluded))
      throw new Error(
        "O propunere conține un ingredient exclus. Încearcă din nou.",
      );
    if (recipe.time > p.maxMinutes)
      throw new Error("O rețetă depășește timpul ales. Încearcă din nou.");
    recipe.meal_type = meal;
    return { id: key, day, meal, servings: p.people, recipe };
  });
}
