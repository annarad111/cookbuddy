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
      initial || {
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
      <Title>{initial ? "Verifică și editează rețeta" : "O rețetă nouă"}</Title>
      <Card>
        <Field
          label="Numele rețetei"
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
              label="Porții în rețeta de bază"
              value={String(recipe.servings || "")}
              numeric
              onChangeText={(v) =>
                update({ servings: Number(v.replace(/[^\d]/g, "")) })
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Timp (minute)"
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
            { value: "any", label: "Orice masă" },
          ]}
          onChange={(meal_type) => update({ meal_type })}
        />
      </Card>
      <Title>Ingrediente</Title>
      <Copy>
        Cantitățile sunt pentru toate porțiile rețetei. Folosește cantitate
        numerică și unitate pentru recalculare automată.
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
                  label="Cantitate"
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
              <View style={{ flex: 1 }}>
                <Field
                  label="Unitate"
                  value={i.unit || parsed?.unit || ""}
                  onChangeText={(unit) =>
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
              </View>
            </View>
            {!parsed && !!i.amount && (
              <Copy>
                Cantitate veche: {i.amount}. Completează câmpurile numerice sau
                păstreaz-o ca atare.
              </Copy>
            )}
            {!parsed && !i.quantity && (
              <Field
                label="Cantitate liberă (ex.: după gust)"
                value={i.amount}
                onChangeText={(amount) => updateIngredient(i.id, { amount })}
              />
            )}
            <Action
              secondary
              label="Elimină ingredientul"
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
          label="Calorii pe porție (kcal) · opțional"
          numeric
          value={recipe.calories != null ? String(recipe.calories) : ""}
          onChangeText={(v) => {
            const digits = v.replace(/[^\d]/g, "");
            update({ calories: digits ? Math.min(5000, Number(digits)) : null });
          }}
        />
        <Copy>
          Nu le știi? Completează întâi ingredientele, apoi lasă aplicația să le
          calculeze. Valorile sunt estimări.
        </Copy>
        <View style={ui.row}>
          <Action
            secondary
            label="Calculează din ingrediente"
            disabled={caloriesTask.busy}
            onPress={() =>
              caloriesTask.run(async () => {
                if (!filledIngredients().length || !(recipe.servings > 0))
                  throw new Error("Completează ingredientele și porțiile.");
                const e = estimateCalories(recipe);
                if (e.perServing == null)
                  throw new Error(
                    `Nu pot calcula pentru: ${e.unknown.join(", ")}. Verifică denumirea și cantitatea (g, ml, buc) sau folosește AI.`,
                  );
                update({ calories: e.perServing });
                return `≈ ${e.perServing} kcal/porție (${e.total} kcal în total).`;
              })
            }
          />
          <Action
            secondary
            label="Estimează cu AI ✨"
            disabled={caloriesTask.busy}
            onPress={() =>
              caloriesTask.run(async () => {
                if (!filledIngredients().length || !(recipe.servings > 0))
                  throw new Error("Completează ingredientele și porțiile.");
                const r = await estimateCaloriesAI({
                  ...recipe,
                  ingredients: filledIngredients(),
                });
                update({ calories: r.calories });
                return `AI: ≈ ${r.calories} kcal/porție.${r.note ? " " + r.note : ""}`;
              })
            }
          />
        </View>
        {caloriesTask.status}
      </Card>
      <Card>
        <Field
          label="Pași (câte unul pe rând)"
          value={recipe.steps}
          multiline
          onChangeText={(steps) => update({ steps })}
        />
        <Field
          label="Notițe"
          value={recipe.notes || ""}
          multiline
          onChangeText={(notes) => update({ notes })}
        />
      </Card>
      {task.status}
      <Action
        label="Salvează rețeta"
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            if (!recipe.title.trim() || !recipe.steps.trim())
              throw new Error("Completează numele și pașii rețetei.");
            if (
              !Number.isInteger(recipe.servings) ||
              recipe.servings < 1 ||
              recipe.servings > 100 ||
              !Number.isInteger(recipe.time) ||
              recipe.time < 1 || recipe.time > 1440
            )
              throw new Error("Completează porții și durată valide.");
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
                "Verifică denumirile și cantitățile ingredientelor.",
              );
            await onSave({
              ...recipe,
              title: recipe.title.trim(),
              ingredients: recipe.ingredients.map((i) => {
                const q = ingredientQuantity(i);
                return q
                  ? { ...i, ...q, amount: formatQuantity(q.quantity, q.unit) }
                  : { ...i, amount: i.amount || "după gust" };
              }),
            });
          })
        }
      />
    </Page>
  );
}
