import { useState } from "react";
import { View, Image } from "react-native";
import * as Crypto from "expo-crypto";
import {
  Ingredient,
  Recipe,
  Meal,
  mealLabels,
  ingredientQuantity,
  formatQuantity,
  METRIC_UNITS,
} from "@/domain/cooking";
import { estimateCalories } from "@/domain/nutrition";
import { estimateCaloriesAI } from "@/lib/cooking-ai";
import ImagePickerInput from "./ImagePickerInput";
import {
  Action,
  Card,
  Choice,
  Copy,
  Field,
  Page,
  Title,
  ui,
  useTask,
} from "./KitchenUI";
export default function RecipeEditor({
  initial,
  onSave,
}: {
  initial?: Recipe;
  onSave: (recipe: Recipe) => Promise<void>;
}) {
  const task = useTask();
  const [recipe, setRecipe] = useState<Recipe>(
    () =>
      (initial && {
        ...initial,
        // Show older spoon/cup/oz quantities as g or ml so they can be edited.
        ingredients: initial.ingredients.map((i) => {
          const q = ingredientQuantity(i);
          return q
            ? { ...i, ...q, amount: formatQuantity(q.quantity, q.unit) }
            : i;
        }),
      }) || {
        id: "",
        title: "",
        servings: 2,
        time: 30,
        meal_type: "dinner",
        ingredients: [
          {
            id: Crypto.randomUUID(),
            name: "",
            amount: "",
            quantity: null,
            unit: "g",
          },
        ],
        steps: "",
        notes: "",
      },
  );
  const [rawQuantity, setRawQuantity] = useState<Record<string, string>>({});
  const caloriesTask = useTask();
  // What the next calorie calculation sees: ingredients as currently typed.
  const filledIngredients = () =>
    recipe.ingredients.filter((i) => i.name.trim());
  const update = (fields: Partial<Recipe>) =>
    setRecipe((r) => ({ ...r, ...fields }));
  const updateIngredient = (id: string, fields: Partial<Ingredient>) =>
    setRecipe((r) => ({
      ...r,
      ingredients: r.ingredients.map((i) =>
        i.id === id ? { ...i, ...fields } : i,
      ),
    }));
  return (
    <Page>
      <Title>{initial ? "Review and edit the recipe" : "New recipe"}</Title>
      <Card>
        <Field
          label="Recipe name"
          value={recipe.title}
          onChangeText={(title) => update({ title })}
        />
        <ImagePickerInput
          image={recipe.image_url || ""}
          width="100%"
          onChange={(image_url) => update({ image_url })}
        />
        <View style={ui.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Servings in the base recipe"
              value={String(recipe.servings || "")}
              numeric
              onChangeText={(v) =>
                update({ servings: Number(v.replace(/[^\d]/g, "")) })
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Time (minutes)"
              value={String(recipe.time || "")}
              numeric
              onChangeText={(v) =>
                update({ time: Number(v.replace(/[^\d]/g, "")) })
              }
            />
          </View>
        </View>
        <Choice
          value={recipe.meal_type || "any"}
          options={[
            ...(["breakfast", "lunch", "dinner"] as Meal[]).map((value) => ({
              value: value as Meal | "any",
              label: mealLabels[value],
            })),
            { value: "any", label: "Any meal" },
          ]}
          onChange={(meal_type) => update({ meal_type })}
        />
      </Card>
      <Title>Ingrediente</Title>
      <Copy>
        Quantities are for all servings of the recipe. Use a numeric quantity and a unit so they can be recalculated automatically.
      </Copy>
      {recipe.ingredients.map((i) => {
        const parsed = ingredientQuantity(i);
        return (
          <Card key={i.id}>
            <Field
              label="Ingredient"
              value={i.name}
              onChangeText={(name) => updateIngredient(i.id, { name })}
            />
            <View style={ui.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Quantity"
                  numeric
                  value={
                    rawQuantity[i.id] ??
                    (i.quantity != null
                      ? String(i.quantity)
                      : parsed
                        ? String(parsed.quantity)
                        : "")
                  }
                  onChangeText={(v) => {
                    // Keep the typed text so "0," or "1." can be completed to a decimal.
                    setRawQuantity((raw) => ({ ...raw, [i.id]: v }));
                    const n = Number(v.trim().replace(",", "."));
                    const quantity = v.trim() && Number.isFinite(n) ? n : null;
                    const unit = i.unit || parsed?.unit || "g";
                    updateIngredient(i.id, {
                      quantity,
                      unit,
                      amount: quantity ? formatQuantity(quantity, unit) : "",
                    });
                  }}
                />
              </View>
            </View>
            <Choice
              value={i.unit || parsed?.unit || ""}
              options={METRIC_UNITS.map((u) => ({ value: u as string, label: u }))}
              onChange={(unit) =>
                updateIngredient(i.id, {
                  unit,
                  quantity: i.quantity ?? parsed?.quantity ?? null,
                  amount:
                    i.quantity || parsed?.quantity
                      ? formatQuantity(i.quantity || parsed!.quantity, unit)
                      : i.amount,
                })
              }
            />
            {!parsed && !!i.amount && (
              <Copy>
                Old quantity: {i.amount}. Fill in the numeric fields or keep it as is.
              </Copy>
            )}
            {!parsed && !i.quantity && (
              <Field
                label="Free-form quantity (e.g. to taste)"
                value={i.amount}
                onChangeText={(amount) => updateIngredient(i.id, { amount })}
              />
            )}
            <Action
              secondary
              label="Remove ingredient"
              disabled={recipe.ingredients.length === 1}
              onPress={() =>
                update({
                  ingredients: recipe.ingredients.filter(
                    (item) => item.id !== i.id,
                  ),
                })
              }
            />
          </Card>
        );
      })}
      <Action
        secondary
        label="+ Ingredient"
        onPress={() =>
          update({
            ingredients: [
              ...recipe.ingredients,
              {
                id: Crypto.randomUUID(),
                name: "",
                amount: "",
                quantity: null,
                unit: "g",
              },
            ],
          })
        }
      />
      <Card>
        <Field
          label="Calories per serving (kcal) · optional"
          numeric
          value={recipe.calories != null ? String(recipe.calories) : ""}
          onChangeText={(v) => {
            const digits = v.replace(/[^\d]/g, "");
            update({ calories: digits ? Math.min(5000, Number(digits)) : null });
          }}
        />
        <Copy>
          Don't know them? Fill in the ingredients first, then let the app calculate them. Values are estimates.
        </Copy>
        <View style={ui.row}>
          <Action
            secondary
            label="Calculate from ingredients"
            disabled={caloriesTask.busy}
            onPress={() =>
              caloriesTask.run(async () => {
                if (!filledIngredients().length || !(recipe.servings > 0))
                  throw new Error("Fill in the ingredients and servings.");
                const e = estimateCalories(recipe);
                if (e.perServing == null)
                  throw new Error(
                    `Can't calculate for: ${e.unknown.join(", ")}. Check the name and quantity (g, ml, pcs) or use AI.`,
                  );
                update({ calories: e.perServing });
                return `≈ ${e.perServing} kcal/serving (${e.total} kcal total).`;
              })
            }
          />
          <Action
            secondary
            label="Estimate with AI ✨"
            disabled={caloriesTask.busy}
            onPress={() =>
              caloriesTask.run(async () => {
                if (!filledIngredients().length || !(recipe.servings > 0))
                  throw new Error("Fill in the ingredients and servings.");
                const r = await estimateCaloriesAI({
                  ...recipe,
                  ingredients: filledIngredients(),
                });
                update({ calories: r.calories });
                return `AI: ≈ ${r.calories} kcal/serving.${r.note ? " " + r.note : ""}`;
              })
            }
          />
        </View>
        {caloriesTask.status}
      </Card>
      <Card>
        <Field
          label="Steps (one per line)"
          value={recipe.steps}
          multiline
          onChangeText={(steps) => update({ steps })}
        />
        <Field
          label="Notes"
          value={recipe.notes || ""}
          multiline
          onChangeText={(notes) => update({ notes })}
        />
      </Card>
      {task.status}
      <Action
        label="Save recipe"
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            if (!recipe.title.trim() || !recipe.steps.trim())
              throw new Error("Fill in the recipe name and steps.");
            if (
              !Number.isInteger(recipe.servings) ||
              recipe.servings < 1 ||
              recipe.servings > 100 ||
              !Number.isInteger(recipe.time) ||
              recipe.time < 1 || recipe.time > 1440
            )
              throw new Error("Enter valid servings and time.");
            if (
              !recipe.ingredients.length ||
              recipe.ingredients.some(
                (i) =>
                  !i.name.trim() ||
                  (i.quantity != null &&
                    (!Number.isFinite(i.quantity) || i.quantity < 0)),
              )
            )
              throw new Error(
                "Check the ingredient names and quantities.",
              );
            await onSave({
              ...recipe,
              title: recipe.title.trim(),
              ingredients: recipe.ingredients.map((i) => {
                const q = ingredientQuantity(i);
                return q
                  ? { ...i, ...q, amount: formatQuantity(q.quantity, q.unit) }
                  : { ...i, amount: i.amount || "to taste" };
              }),
            });
          })
        }
      />
    </Page>
  );
}
