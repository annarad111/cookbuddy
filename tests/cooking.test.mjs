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
    /eligibile/,
  );
  assert.throws(
    () => localPlan(recipes, { ...p, maxMinutes: 10 }),
    /eligibile/,
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
    /repetat/,
  );
  assert.throws(
    () => validatePlan(valid, { ...p, excluded: "orez" }),
    /exclus/,
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
