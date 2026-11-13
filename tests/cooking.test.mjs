import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shoppingList,
  ingredientQuantity,
  scaledIngredient,
  defaultKitchen,
  localPlan,
  validatePlan,
  validateRecipe,
  excludedRecipe,
} from "../src/domain/cooking.ts";
const ingredient = (name, quantity, unit) => ({
  id: name + unit,
  name,
  quantity,
  unit,
  amount: `${quantity} ${unit}`,
});
const recipe = (id, ingredients, meal_type = "dinner") => ({
  id,
  title: id,
  servings: 2,
  time: 25,
  ingredients,
  steps: "Prepară.\nServește.",
  meal_type,
});
const entry = (id, r, servings = 2) => ({
  id,
  day: 1,
  meal: "dinner",
  servings,
  recipe: r,
});
test("aggregates portions, kg/g conversion and duplicate pantry stock without mutating recipes", () => {
  const chicken = recipe("Pui", [ingredient("Piept de pui", 500, "g")]);
  const second = recipe("Wrap", [ingredient("piept de pui", 1, "kg")]);
  const plan = [entry("1", chicken, 6), entry("2", second)];
  const items = shoppingList(plan, [
    { id: "p1", name: "piept de pui", quantity: 0.5, unit: "kg" },
    { id: "p2", name: "piept de pui", quantity: 200, unit: "g" },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 1800);
  assert.equal(chicken.ingredients[0].quantity, 500);
});
test("does not merge grams and millilitres, different ingredient names or unknown text", () => {
  const r = recipe("Sos", [
    ingredient("Lapte", 100, "g"),
    ingredient("Lapte", 200, "ml"),
    { id: "salt", name: "Sare", amount: "după gust" },
    ingredient("Lapte vegetal", 100, "ml"),
  ]);
  const list = shoppingList([entry("1", r), entry("2", r)], []);
  assert.equal(list.length, 5);
  assert.equal(list.filter((i) => i.quantity === null).length, 2);
});
test("supports old amounts including fractions; refuses ambiguous ranges", () => {
  assert.deepEqual(ingredientQuantity({ amount: "1/2 kg" }), {
    quantity: 0.5,
    unit: "kg",
  });
  assert.deepEqual(ingredientQuantity({ amount: "1,5 l" }), {
    quantity: 1.5,
    unit: "l",
  });
  assert.equal(ingredientQuantity({ amount: "2-3 buc" }), null);
  assert.equal(ingredientQuantity({ amount: "1/0 kg" }), null);
  assert.equal(scaledIngredient(ingredient("Ovăz", 80, "g"), 6, 2), "240 g");
  assert.match(scaledIngredient({ amount: "după gust" }, 6, 2), /manual/);
});
test("pantry can fully satisfy a shopping item", () => {
  assert.equal(
    shoppingList(
      [entry("1", recipe("Ouă", [ingredient("Ouă", 4, "buc")]))],
      [{ id: "p", name: "oua", quantity: 6, unit: "buc" }],
    ).length,
    0,
  );
});
test("local planning respects category, time, exclusions, repeats and all day slots", () => {
  const recipes = ["breakfast", "lunch", "dinner"].flatMap((m) => [
    recipe(m + "1", [ingredient("Orez", 100, "g")], m),
    recipe(m + "2", [ingredient("Cartofi", 100, "g")], m),
  ]);
  const p = {
    ...defaultKitchen().preferences,
    source: "saved",
    repeatMeals: false,
  };
  const plan = localPlan(recipes, p);
  assert.equal(plan.length, 9);
  assert.equal(plan[0].recipe.id, "breakfast1");
  assert.equal(plan[3].recipe.id, "breakfast2");
  assert.throws(
    () => localPlan(recipes, { ...p, excluded: "orez, cartofi" }),
    /No eligible recipes/,
  );
  assert.throws(
    () => localPlan(recipes, { ...p, maxMinutes: 10 }),
    /No eligible recipes/,
  );
  assert.equal(
    excludedRecipe(recipe("A", [ingredient("Pește", 100, "g")]), "peste"),
    true,
  );
});
test("AI plans require every slot once, valid numeric amounts and filters", () => {
  const p = { ...defaultKitchen().preferences, days: 1 };
  const valid = {
    meals: ["breakfast", "lunch", "dinner"].map((meal) => ({
      day: 1,
      meal,
      recipe: recipe(meal, [ingredient("Orez", 100, "g")], meal),
    })),
  };
  assert.equal(validatePlan(valid, p).length, 3);
  assert.throws(() => validatePlan({ meals: valid.meals.slice(1) }, p));
  assert.throws(
    () =>
      validatePlan(
        { meals: [valid.meals[0], valid.meals[0], valid.meals[2]] },
        p,
      ),
    /repeated a meal slot/,
  );
  assert.throws(
    () => validatePlan(valid, { ...p, excluded: "orez" }),
    /excluded ingredient/,
  );
  assert.throws(() =>
    validateRecipe({ ...valid.meals[0].recipe, servings: 0 }, "bad"),
  );
  assert.throws(() =>
    validateRecipe(
      { ...valid.meals[0].recipe, ingredients: [ingredient("Orez", -5, "g")] },
      "bad",
    ),
  );
});

test("estimates calories per portion from known ingredients", async () => {
  const { estimateCalories, findFood } = await import("../src/domain/nutrition.ts");
  // Longest name wins: "piept de pui" is leaner than generic "pui".
  assert.equal(findFood("Piept de pui").kcal, 120);
  assert.equal(findFood("Ulei de măsline").kcal, 884);
  assert.equal(findFood("Unt de arahide").kcal, 588);
  assert.equal(findFood("Mărar"), findFood("marar")); // spices, not "măr"
  assert.equal(findFood("Mărar").kcal, 0);
  const r = {
    servings: 2,
    ingredients: [
      ingredient("Piept de pui", 500, "g"), // 600
      ingredient("Orez", 0.2, "kg"), // 720
      { id: "o", name: "Ouă", quantity: 2, unit: "buc", amount: "2 buc" }, // 157.3
      ingredient("Ulei", 1, "lingură"), // 15 ml * 0.92 g/ml * 8.84 = 122
      { id: "s", name: "Sare", quantity: null, unit: "", amount: "după gust" },
    ],
  };
  const e = estimateCalories(r);
  assert.deepEqual(e.unknown, []);
  assert.equal(e.total, 1599);
  assert.equal(e.perServing, 800);
  const partial = estimateCalories({
    servings: 2,
    ingredients: [ingredient("Orez", 100, "g"), ingredient("Sos secret", 50, "g")],
  });
  assert.equal(partial.perServing, null, "never guess unknown ingredients");
  assert.deepEqual(partial.unknown, ["Sos secret"]);
});

test("AI recipes keep a sane calorie estimate and drop invalid ones", () => {
  const base = {
    title: "Orez",
    servings: 2,
    time: 20,
    ingredients: [{ name: "Orez", quantity: 150, unit: "g" }],
    steps: "Fierbe.",
  };
  assert.equal(validateRecipe({ ...base, calories: 412.6 }, "a").calories, 413);
  assert.equal(validateRecipe({ ...base, calories: 99999 }, "b").calories, null);
  assert.equal(validateRecipe(base, "c").calories, null);
});

test("units are metric: spoons, cups, oz and lb convert to g/ml; older Romanian units still match", async () => {
  const { estimateCalories, findFood } = await import("../src/domain/nutrition.ts");
  assert.deepEqual(ingredientQuantity({ amount: "2 pcs" }), { quantity: 2, unit: "pcs" });
  assert.deepEqual(ingredientQuantity({ amount: "3 buc" }), { quantity: 3, unit: "pcs" });
  assert.deepEqual(ingredientQuantity({ amount: "1 lingură" }), { quantity: 15, unit: "ml" });
  assert.deepEqual(ingredientQuantity({ amount: "2 tablespoons" }), { quantity: 30, unit: "ml" });
  assert.deepEqual(ingredientQuantity({ amount: "1 tsp" }), { quantity: 5, unit: "ml" });
  assert.deepEqual(ingredientQuantity({ amount: "1 cup" }), { quantity: 240, unit: "ml" });
  assert.deepEqual(ingredientQuantity(ingredient("Butter", 4, "oz")), { quantity: 113, unit: "g" });
  assert.equal(scaledIngredient(ingredient("Flour", 1, "lb"), 2, 1), "908 g");
  // AI answers are stored metric.
  const ai = validateRecipe(
    {
      title: "Oats",
      servings: 1,
      time: 5,
      ingredients: [{ name: "Olive oil", quantity: 2, unit: "tbsp" }],
      steps: "Mix.",
    },
    "m",
  );
  assert.deepEqual(
    { quantity: ai.ingredients[0].quantity, unit: ai.ingredients[0].unit, amount: ai.ingredients[0].amount },
    { quantity: 30, unit: "ml", amount: "30 ml" },
  );
  // Shopping adds spoons and millilitres of the same thing together.
  const items = shoppingList(
    [entry("1", recipe("Salad", [ingredient("Olive oil", 2, "tbsp"), ingredient("olive oil", 20, "ml")]), 2)],
    [],
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 50);
  assert.equal(items[0].unit, "ml");
  assert.equal(findFood("Chicken breast").kcal, 120);
  assert.equal(findFood("Bell peppers").kcal, 26, "bell pepper, not black pepper");
  assert.equal(findFood("Black pepper").kcal, 0);
  const e = estimateCalories({
    servings: 1,
    ingredients: [
      ingredient("Rolled oats", 50, "g"), // 190
      ingredient("Milk", 1, "cup"), // 240 ml * 1.03 * 0.64 = 158.2
      ingredient("Banana", 1, "pcs"), // 106.8
      ingredient("Peanut butter", 1, "oz"), // 28 g * 5.88 = 164.6
    ],
  });
  assert.deepEqual(e.unknown, []);
  assert.equal(e.perServing, 620);
});
