import {
  baseQuantity,
  ingredientQuantity,
  normalize,
  type Recipe,
} from "./cooking.ts";

/**
 * Approximate energy values for common raw ingredients (kcal per 100 g, or per
 * 100 ml for liquids). Good enough for a home-cooking estimate, not a medical
 * or label-grade calculation.
 * `piece`: typical grams per piece ("buc"); `density`: g per ml when it differs from 1.
 */
type Food = { names: string[]; kcal: number; piece?: number; density?: number };
const FOODS: Food[] = [
  // Meat, fish, eggs
  { names: ["piept de pui", "piept pui", "file de pui"], kcal: 120 },
  { names: ["pulpe de pui", "pulpa de pui", "pulpe pui"], kcal: 175 },
  { names: ["pui", "carne de pui"], kcal: 150 },
  { names: ["curcan", "piept de curcan"], kcal: 115 },
  { names: ["carne tocata", "tocatura", "carne tocata mixta"], kcal: 250 },
  { names: ["carne de porc", "porc", "ceafa", "cotlet"], kcal: 240 },
  { names: ["carne de vita", "vita", "muschi de vita"], kcal: 200 },
  { names: ["somon"], kcal: 208 },
  { names: ["ton", "ton din conserva"], kcal: 116 },
  { names: ["peste", "cod", "pastrav", "dorada"], kcal: 100 },
  { names: ["creveti"], kcal: 85 },
  { names: ["bacon", "costita afumata"], kcal: 420 },
  { names: ["sunca", "piept de curcan afumat"], kcal: 145 },
  { names: ["carnati", "carnat", "cârnați"], kcal: 300 },
  { names: ["ou", "oua", "ouă"], kcal: 143, piece: 55 },
  { names: ["albus", "albusuri"], kcal: 52, piece: 33 },
  // Dairy
  { names: ["lapte"], kcal: 64, density: 1.03 },
  { names: ["iaurt grecesc"], kcal: 97 },
  { names: ["iaurt"], kcal: 60 },
  { names: ["kefir", "sana", "lapte batut"], kcal: 55 },
  { names: ["smantana"], kcal: 200 },
  { names: ["frisca", "smantana pentru gatit"], kcal: 300 },
  { names: ["branza de vaci", "cottage"], kcal: 98 },
  { names: ["ricotta"], kcal: 174 },
  { names: ["telemea", "feta", "branza feta"], kcal: 265 },
  { names: ["mozzarella"], kcal: 280 },
  { names: ["cascaval", "cheddar", "gouda", "emmentaler"], kcal: 360 },
  { names: ["parmezan", "parmigiano"], kcal: 430 },
  { names: ["branza", "branza rasa"], kcal: 300 },
  { names: ["unt"], kcal: 717 },
  // Fats, sweeteners
  { names: ["ulei", "ulei de masline", "ulei de floarea soarelui", "ulei de cocos"], kcal: 884, density: 0.92 },
  { names: ["zahar", "zahar brun", "zahar pudra"], kcal: 400 },
  { names: ["miere"], kcal: 304, density: 1.4 },
  { names: ["sirop de artar"], kcal: 260, density: 1.3 },
  { names: ["ciocolata", "ciocolata neagra"], kcal: 546 },
  { names: ["cacao"], kcal: 228 },
  { names: ["unt de arahide"], kcal: 588 },
  { names: ["nuci", "nuca"], kcal: 654 },
  { names: ["migdale", "migdala"], kcal: 579 },
  { names: ["alune", "arahide"], kcal: 600 },
  { names: ["seminte", "seminte de chia", "chia", "seminte de in"], kcal: 500 },
  { names: ["proteina", "pudra proteica", "proteina whey"], kcal: 380 },
  // Grains, starch, legumes (raw/dry)
  { names: ["faina", "faina alba", "faina integrala"], kcal: 364 },
  { names: ["orez", "orez basmati", "orez brun"], kcal: 360 },
  { names: ["paste", "spaghete", "penne", "fusilli", "macaroane", "taitei", "lasagna"], kcal: 371 },
  { names: ["fulgi de ovaz", "ovaz"], kcal: 380 },
  { names: ["malai", "mamaliga"], kcal: 360 },
  { names: ["cuscus", "bulgur", "quinoa"], kcal: 360 },
  { names: ["paine", "paine integrala", "chifla"], kcal: 265, piece: 60 },
  { names: ["lipie", "tortilla", "wrap"], kcal: 300, piece: 60 },
  { names: ["pesmet"], kcal: 395 },
  { names: ["cartofi", "cartof"], kcal: 77, piece: 170 },
  { names: ["cartofi dulci", "cartof dulce"], kcal: 86, piece: 200 },
  { names: ["linte"], kcal: 352 },
  { names: ["naut"], kcal: 364 },
  { names: ["fasole", "fasole uscata"], kcal: 333 },
  { names: ["fasole din conserva", "fasole boabe conserva"], kcal: 90 },
  { names: ["mazare"], kcal: 81 },
  { names: ["porumb"], kcal: 86 },
  // Vegetables
  { names: ["rosii", "rosie", "rosii cherry", "tomate"], kcal: 18, piece: 120 },
  { names: ["castravete", "castraveti"], kcal: 15, piece: 200 },
  { names: ["ardei", "ardei gras", "ardei kapia"], kcal: 26, piece: 150 },
  { names: ["ceapa", "cepe", "ceapa rosie"], kcal: 40, piece: 110 },
  { names: ["ceapa verde"], kcal: 32, piece: 15 },
  { names: ["usturoi", "catel de usturoi", "catei de usturoi"], kcal: 149, piece: 5 },
  { names: ["morcov", "morcovi"], kcal: 41, piece: 70 },
  { names: ["dovlecel", "dovlecei"], kcal: 17, piece: 250 },
  { names: ["vinete", "vanata"], kcal: 25, piece: 300 },
  { names: ["broccoli"], kcal: 34 },
  { names: ["conopida"], kcal: 25 },
  { names: ["spanac"], kcal: 23 },
  { names: ["ciuperci", "ciuperca"], kcal: 22 },
  { names: ["varza", "varza rosie"], kcal: 25 },
  { names: ["salata", "salata verde", "rucola"], kcal: 15 },
  { names: ["telina"], kcal: 16 },
  { names: ["sfecla"], kcal: 43, piece: 150 },
  { names: ["avocado"], kcal: 160, piece: 170 },
  // Fruit
  { names: ["banana", "banane"], kcal: 89, piece: 120 },
  { names: ["mar", "mere"], kcal: 52, piece: 180 },
  { names: ["para", "pere"], kcal: 57, piece: 180 },
  { names: ["lamaie", "lamai", "lime"], kcal: 29, piece: 100 },
  { names: ["portocala", "portocale"], kcal: 47, piece: 180 },
  { names: ["capsuni"], kcal: 32 },
  { names: ["afine", "zmeura", "fructe de padure"], kcal: 55 },
  // Sauces
  { names: ["passata", "sos de rosii", "bulion", "rosii din conserva", "suc de rosii"], kcal: 30 },
  { names: ["pasta de tomate", "pasta de rosii"], kcal: 82 },
  { names: ["maioneza"], kcal: 680 },
  { names: ["ketchup"], kcal: 112 },
  { names: ["mustar"], kcal: 66 },
  { names: ["sos de soia"], kcal: 53 },
  { names: ["supa", "supa de legume", "supa de pui", "bors"], kcal: 10 },
  // Negligible
  {
    names: [
      "apa", "sare", "piper", "boia", "oregano", "busuioc", "cimbru", "rozmarin",
      "patrunjel", "marar", "leustean", "scortisoara", "chimen", "curry",
      "turmeric", "ghimbir", "condimente", "foi de dafin", "dafin", "otet",
      "praf de copt", "bicarbonat", "drojdie", "vanilie", "esenta de vanilie",
    ],
    kcal: 0,
  },
];

// Longest names first so "piept de pui" wins over "pui", "unt de arahide" over "unt".
const INDEX = FOODS.flatMap((food) =>
  food.names.map((name) => ({ name: normalize(name), food })),
).sort((a, b) => b.name.length - a.name.length);

export function findFood(ingredientName: string): Food | null {
  const name = ` ${normalize(ingredientName).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  const hit = INDEX.find(({ name: key }) => name.includes(` ${key} `));
  return hit?.food ?? null;
}

const SPOON: Record<string, number> = { "lingură": 15, "linguriță": 5, cana: 240, "cană": 240, cup: 240 };

/** Grams of the ingredient, or null when the unit can't be converted for this food. */
function grams(food: Food, quantity: number, unit: string): number | null {
  const base = baseQuantity(quantity, unit);
  if (base.unit === "g") return base.quantity;
  if (base.unit === "mg") return base.quantity / 1000;
  if (base.unit === "ml") return base.quantity * (food.density ?? 1);
  if (base.unit === "cl") return base.quantity * 10 * (food.density ?? 1);
  if (base.unit === "buc") return food.piece ? base.quantity * food.piece : null;
  if (SPOON[base.unit]) return base.quantity * SPOON[base.unit] * (food.density ?? 1);
  return null;
}

export type CalorieEstimate = {
  /** kcal per portion, rounded; null when some ingredient couldn't be calculated. */
  perServing: number | null;
  total: number;
  /** Ingredient names that were not recognized or had an unusable quantity. */
  unknown: string[];
};

/** Calorie estimate from the recipe's ingredients using the built-in table. */
export function estimateCalories(
  recipe: Pick<Recipe, "ingredients" | "servings">,
): CalorieEstimate {
  let total = 0;
  const unknown: string[] = [];
  for (const i of recipe.ingredients) {
    if (!i.name.trim()) continue;
    const food = findFood(i.name);
    const q = ingredientQuantity(i);
    if (food && food.kcal === 0) continue; // water, salt, spices: negligible either way
    const g = food && q ? grams(food, q.quantity, q.unit) : null;
    if (food == null || g == null) {
      unknown.push(i.name.trim());
      continue;
    }
    total += (g * food.kcal) / 100;
  }
  return {
    total: Math.round(total),
    perServing:
      unknown.length || !(recipe.servings > 0)
        ? null
        : Math.round(total / recipe.servings),
    unknown,
  };
}

/**
 * kcal per person for one day of the plan (one portion of each meal).
 * `missing` counts meals whose recipe has no calorie value yet.
 */
export function dayCalories(
  plan: { day: number; recipe: Pick<Recipe, "calories"> }[],
  day: number,
): { perPerson: number; missing: number } {
  let perPerson = 0;
  let missing = 0;
  for (const e of plan)
    if (e.day === day) {
      if (e.recipe.calories != null) perPerson += e.recipe.calories;
      else missing++;
    }
  return { perPerson, missing };
}
