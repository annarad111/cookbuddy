import {
  baseQuantity,
  ingredientQuantity,
  normalize,
  type Recipe,
} from "./cooking.ts";

/**
 * Approximate energy values for common raw ingredients (kcal per 100 g, or per
 * 100 ml for liquids). Good enough for a home-cooking estimate, not a medical
 * or label-grade calculation. English names first; Romanian names are kept so
 * recipes saved before the English version still match.
 * `piece`: typical grams per piece ("pcs"); `density`: g per ml when it differs from 1.
 */
export const AISLES = [
  "Fruit & vegetables",
  "Meat & fish",
  "Dairy & eggs",
  "Bakery",
  "Pantry",
  "Spices & basics",
  "Other",
] as const;
export type Aisle = (typeof AISLES)[number];
type Food = { names: string[]; kcal: number; piece?: number; density?: number; aisle?: Aisle };
const FOODS: Food[] = [
  // Meat, fish, eggs
  { names: ["chicken breast", "chicken fillet", "piept de pui", "piept pui", "file de pui"], kcal: 120, aisle: "Meat & fish" },
  { names: ["chicken thigh", "chicken thighs", "chicken legs", "pulpe de pui", "pulpa de pui", "pulpe pui"], kcal: 175, aisle: "Meat & fish" },
  { names: ["chicken", "pui", "carne de pui"], kcal: 150, aisle: "Meat & fish" },
  { names: ["turkey", "turkey breast", "curcan", "piept de curcan"], kcal: 115, aisle: "Meat & fish" },
  { names: ["ground meat", "minced meat", "ground beef", "minced beef", "ground pork", "carne tocata", "tocatura", "carne tocata mixta"], kcal: 250, aisle: "Meat & fish" },
  { names: ["pork", "pork chop", "pork loin", "carne de porc", "porc", "ceafa", "cotlet"], kcal: 240, aisle: "Meat & fish" },
  { names: ["beef", "steak", "beef sirloin", "carne de vita", "vita", "muschi de vita"], kcal: 200, aisle: "Meat & fish" },
  { names: ["salmon", "somon"], kcal: 208, aisle: "Meat & fish" },
  { names: ["tuna", "canned tuna", "ton", "ton din conserva"], kcal: 116, aisle: "Meat & fish" },
  { names: ["fish", "cod", "trout", "sea bream", "white fish", "peste", "pastrav", "dorada"], kcal: 100, aisle: "Meat & fish" },
  { names: ["shrimp", "prawns", "creveti"], kcal: 85, aisle: "Meat & fish" },
  { names: ["bacon", "costita afumata"], kcal: 420, aisle: "Meat & fish" },
  { names: ["ham", "smoked turkey", "sunca", "piept de curcan afumat"], kcal: 145, aisle: "Meat & fish" },
  { names: ["sausage", "sausages", "carnati", "carnat"], kcal: 300, aisle: "Meat & fish" },
  { names: ["egg", "eggs", "ou", "oua"], kcal: 143, piece: 55, aisle: "Dairy & eggs" },
  { names: ["egg white", "egg whites", "albus", "albusuri"], kcal: 52, piece: 33, aisle: "Dairy & eggs" },
  // Dairy
  { names: ["milk", "lapte"], kcal: 64, density: 1.03, aisle: "Dairy & eggs" },
  { names: ["greek yogurt", "greek yoghurt", "iaurt grecesc"], kcal: 97, aisle: "Dairy & eggs" },
  { names: ["yogurt", "yoghurt", "plain yogurt", "iaurt"], kcal: 60, aisle: "Dairy & eggs" },
  { names: ["kefir", "buttermilk", "sana", "lapte batut"], kcal: 55, aisle: "Dairy & eggs" },
  { names: ["sour cream", "smantana"], kcal: 200, aisle: "Dairy & eggs" },
  { names: ["cream", "heavy cream", "whipping cream", "cooking cream", "frisca", "smantana pentru gatit"], kcal: 300, aisle: "Dairy & eggs" },
  { names: ["cottage cheese", "cottage", "branza de vaci"], kcal: 98, aisle: "Dairy & eggs" },
  { names: ["ricotta"], kcal: 174, aisle: "Dairy & eggs" },
  { names: ["feta", "feta cheese", "telemea", "branza feta"], kcal: 265, aisle: "Dairy & eggs" },
  { names: ["mozzarella"], kcal: 280, aisle: "Dairy & eggs" },
  { names: ["cheddar", "gouda", "emmental", "hard cheese", "cascaval", "emmentaler"], kcal: 360, aisle: "Dairy & eggs" },
  { names: ["parmesan", "parmigiano", "parmezan"], kcal: 430, aisle: "Dairy & eggs" },
  { names: ["cheese", "grated cheese", "branza", "branza rasa"], kcal: 300, aisle: "Dairy & eggs" },
  { names: ["butter", "unt"], kcal: 717, aisle: "Dairy & eggs" },
  // Fats, sweeteners, nuts
  { names: ["oil", "olive oil", "sunflower oil", "vegetable oil", "coconut oil", "ulei", "ulei de masline", "ulei de floarea soarelui", "ulei de cocos"], kcal: 884, density: 0.92, aisle: "Pantry" },
  { names: ["sugar", "brown sugar", "powdered sugar", "icing sugar", "zahar", "zahar brun", "zahar pudra"], kcal: 400, aisle: "Pantry" },
  { names: ["honey", "miere"], kcal: 304, density: 1.4, aisle: "Pantry" },
  { names: ["maple syrup", "sirop de artar"], kcal: 260, density: 1.3, aisle: "Pantry" },
  { names: ["chocolate", "dark chocolate", "ciocolata", "ciocolata neagra"], kcal: 546, aisle: "Pantry" },
  { names: ["cocoa", "cocoa powder", "cacao"], kcal: 228, aisle: "Pantry" },
  { names: ["peanut butter", "unt de arahide"], kcal: 588, aisle: "Pantry" },
  { names: ["walnuts", "walnut", "nuci", "nuca"], kcal: 654, aisle: "Pantry" },
  { names: ["almonds", "almond", "migdale", "migdala"], kcal: 579, aisle: "Pantry" },
  { names: ["peanuts", "hazelnuts", "alune", "arahide"], kcal: 600, aisle: "Pantry" },
  { names: ["seeds", "chia seeds", "chia", "flaxseed", "seminte", "seminte de chia", "seminte de in"], kcal: 500, aisle: "Pantry" },
  { names: ["protein powder", "whey protein", "whey", "proteina", "pudra proteica", "proteina whey"], kcal: 380, aisle: "Pantry" },
  // Grains, starch, legumes (raw/dry)
  { names: ["flour", "plain flour", "all purpose flour", "wholemeal flour", "whole wheat flour", "faina", "faina alba", "faina integrala"], kcal: 364, aisle: "Pantry" },
  { names: ["rice", "basmati rice", "brown rice", "jasmine rice", "orez", "orez basmati", "orez brun"], kcal: 360, aisle: "Pantry" },
  { names: ["pasta", "spaghetti", "penne", "fusilli", "macaroni", "noodles", "lasagna sheets", "paste", "spaghete", "macaroane", "taitei", "lasagna"], kcal: 371, aisle: "Pantry" },
  { names: ["oats", "rolled oats", "oat flakes", "oatmeal", "fulgi de ovaz", "ovaz"], kcal: 380, aisle: "Pantry" },
  { names: ["cornmeal", "polenta", "malai", "mamaliga"], kcal: 360, aisle: "Pantry" },
  { names: ["couscous", "bulgur", "quinoa", "cuscus"], kcal: 360, aisle: "Pantry" },
  { names: ["bread", "wholemeal bread", "bread roll", "bun", "paine", "paine integrala", "chifla"], kcal: 265, piece: 60, aisle: "Bakery" },
  { names: ["tortilla", "tortillas", "wrap", "wraps", "pita", "flatbread", "lipie"], kcal: 300, piece: 60, aisle: "Bakery" },
  { names: ["breadcrumbs", "pesmet"], kcal: 395, aisle: "Bakery" },
  { names: ["potatoes", "potato", "cartofi", "cartof"], kcal: 77, piece: 170, aisle: "Fruit & vegetables" },
  { names: ["sweet potatoes", "sweet potato", "cartofi dulci", "cartof dulce"], kcal: 86, piece: 200, aisle: "Fruit & vegetables" },
  { names: ["lentils", "linte"], kcal: 352, aisle: "Pantry" },
  { names: ["chickpeas", "naut"], kcal: 364, aisle: "Pantry" },
  { names: ["beans", "dried beans", "fasole", "fasole uscata"], kcal: 333, aisle: "Pantry" },
  { names: ["canned beans", "kidney beans", "black beans", "fasole din conserva", "fasole boabe conserva"], kcal: 90, aisle: "Pantry" },
  { names: ["peas", "green peas", "mazare"], kcal: 81, aisle: "Fruit & vegetables" },
  { names: ["corn", "sweetcorn", "porumb"], kcal: 86, aisle: "Fruit & vegetables" },
  // Vegetables
  { names: ["tomatoes", "tomato", "cherry tomatoes", "rosii", "rosie", "rosii cherry", "tomate"], kcal: 18, piece: 120, aisle: "Fruit & vegetables" },
  { names: ["cucumber", "cucumbers", "castravete", "castraveti"], kcal: 15, piece: 200, aisle: "Fruit & vegetables" },
  { names: ["bell pepper", "bell peppers", "red pepper", "green pepper", "peppers", "ardei", "ardei gras", "ardei kapia"], kcal: 26, piece: 150, aisle: "Fruit & vegetables" },
  { names: ["onion", "onions", "red onion", "ceapa", "cepe", "ceapa rosie"], kcal: 40, piece: 110, aisle: "Fruit & vegetables" },
  { names: ["spring onion", "spring onions", "green onions", "scallions", "ceapa verde"], kcal: 32, piece: 15, aisle: "Fruit & vegetables" },
  { names: ["garlic", "garlic clove", "garlic cloves", "cloves of garlic", "usturoi", "catel de usturoi", "catei de usturoi"], kcal: 149, piece: 5, aisle: "Fruit & vegetables" },
  { names: ["carrot", "carrots", "morcov", "morcovi"], kcal: 41, piece: 70, aisle: "Fruit & vegetables" },
  { names: ["zucchini", "courgette", "courgettes", "dovlecel", "dovlecei"], kcal: 17, piece: 250, aisle: "Fruit & vegetables" },
  { names: ["eggplant", "aubergine", "vinete", "vanata"], kcal: 25, piece: 300, aisle: "Fruit & vegetables" },
  { names: ["broccoli"], kcal: 34, aisle: "Fruit & vegetables" },
  { names: ["cauliflower", "conopida"], kcal: 25, aisle: "Fruit & vegetables" },
  { names: ["spinach", "spanac"], kcal: 23, aisle: "Fruit & vegetables" },
  { names: ["mushrooms", "mushroom", "ciuperci", "ciuperca"], kcal: 22, aisle: "Fruit & vegetables" },
  { names: ["cabbage", "red cabbage", "varza", "varza rosie"], kcal: 25, aisle: "Fruit & vegetables" },
  { names: ["lettuce", "salad", "salad leaves", "arugula", "rocket", "salata", "salata verde", "rucola"], kcal: 15, aisle: "Fruit & vegetables" },
  { names: ["celery", "telina"], kcal: 16, aisle: "Fruit & vegetables" },
  { names: ["beetroot", "beet", "beets", "sfecla"], kcal: 43, piece: 150, aisle: "Fruit & vegetables" },
  { names: ["avocado", "avocados"], kcal: 160, piece: 170, aisle: "Fruit & vegetables" },
  // Fruit
  { names: ["banana", "bananas", "banane"], kcal: 89, piece: 120, aisle: "Fruit & vegetables" },
  { names: ["apple", "apples", "mar", "mere"], kcal: 52, piece: 180, aisle: "Fruit & vegetables" },
  { names: ["pear", "pears", "para", "pere"], kcal: 57, piece: 180, aisle: "Fruit & vegetables" },
  { names: ["lemon", "lemons", "lime", "limes", "lamaie", "lamai"], kcal: 29, piece: 100, aisle: "Fruit & vegetables" },
  { names: ["orange", "oranges", "portocala", "portocale"], kcal: 47, piece: 180, aisle: "Fruit & vegetables" },
  { names: ["strawberries", "strawberry", "capsuni"], kcal: 32, aisle: "Fruit & vegetables" },
  { names: ["blueberries", "raspberries", "berries", "mixed berries", "afine", "zmeura", "fructe de padure"], kcal: 55, aisle: "Fruit & vegetables" },
  // Sauces
  { names: ["passata", "tomato sauce", "canned tomatoes", "chopped tomatoes", "tomato juice", "sos de rosii", "bulion", "rosii din conserva", "suc de rosii"], kcal: 30, aisle: "Pantry" },
  { names: ["tomato paste", "tomato puree", "pasta de tomate", "pasta de rosii"], kcal: 82, aisle: "Pantry" },
  { names: ["mayonnaise", "mayo", "maioneza"], kcal: 680, aisle: "Pantry" },
  { names: ["ketchup"], kcal: 112, aisle: "Pantry" },
  { names: ["mustard", "mustar"], kcal: 66, aisle: "Pantry" },
  { names: ["soy sauce", "sos de soia"], kcal: 53, aisle: "Pantry" },
  { names: ["stock", "broth", "chicken stock", "vegetable stock", "soup", "supa", "supa de legume", "supa de pui", "bors"], kcal: 10, aisle: "Pantry" },
  // Negligible
  {
    names: [
      "water", "salt", "black pepper", "pepper", "paprika", "oregano", "basil",
      "thyme", "rosemary", "parsley", "dill", "cinnamon", "cumin", "curry",
      "curry powder", "turmeric", "ginger", "spices", "bay leaf", "bay leaves",
      "vinegar", "baking powder", "baking soda", "yeast", "vanilla",
      "vanilla extract", "chili flakes",
      "apa", "sare", "piper", "boia", "busuioc", "cimbru", "rozmarin",
      "patrunjel", "marar", "leustean", "scortisoara", "chimen", "ghimbir",
      "condimente", "foi de dafin", "dafin", "otet", "praf de copt",
      "bicarbonat", "drojdie", "vanilie", "esenta de vanilie",
    ],
    kcal: 0,
    aisle: "Spices & basics",
  },
];

// Longest names first so "chicken breast" wins over "chicken", "peanut butter" over "butter".
const INDEX = FOODS.flatMap((food) =>
  food.names.map((name) => ({ name: normalize(name), food })),
).sort((a, b) => b.name.length - a.name.length);

export function findFood(ingredientName: string): Food | null {
  const name = ` ${normalize(ingredientName).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  const hit = INDEX.find(({ name: key }) => name.includes(` ${key} `));
  return hit?.food ?? null;
}

/** Grams of the ingredient (units arrive metric), or null when they can't be converted. */
function grams(food: Food, quantity: number, unit: string): number | null {
  const base = baseQuantity(quantity, unit);
  if (base.unit === "g") return base.quantity;
  if (base.unit === "ml") return base.quantity * (food.density ?? 1);
  if (base.unit === "pcs") return food.piece ? base.quantity * food.piece : null;
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

/** Supermarket aisle for an ingredient name; "Other" when it isn't in the table. */
export function aisleFor(ingredientName: string): Aisle {
  return findFood(ingredientName)?.aisle ?? "Other";
}
