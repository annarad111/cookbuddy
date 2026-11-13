import { useState } from "react";
import * as Crypto from "expo-crypto";
import { View } from "react-native";
import { useKitchenStore } from "@/store/kitchen-store";
import { useReceipeStore } from "@/store/receipe-store";
import {
  Meal,
  Recipe,
  formatQuantity,
  mealLabels,
  METRIC_UNITS,
  toMetric,
} from "@/domain/cooking";
import { suggestRecipe } from "@/lib/cooking-ai";
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
} from "@/components/KitchenUI";
import MealCard from "@/components/MealCard";
export default function Pantry() {
  const { data, household, commit } = useKitchenStore();
  const { receipes, addReceipe } = useReceipeStore();
  const task = useTask();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g");
  const [meal, setMeal] = useState<Meal>("dinner");
  const [suggestion, setSuggestion] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <Page>
      <Title>What's in the kitchen?</Title>
      <Copy>
        Use the same names as in your recipes so they're subtracted from the shopping list. Update quantities after you cook.
      </Copy>
      <Card>
        <Field label="Ingredient" value={name} onChangeText={setName} />
        <View style={ui.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Quantity"
              value={quantity}
              numeric
              onChangeText={setQuantity}
            />
          </View>
        </View>
        <Choice
          value={unit}
          options={METRIC_UNITS.map((u) => ({ value: u as string, label: u }))}
          onChange={setUnit}
        />
        <Action
          label="Add to pantry"
          disabled={task.busy || !household}
          onPress={() =>
            task.run(async () => {
              const n = Number(quantity.replace(",", "."));
              if (!name.trim() || !Number.isFinite(n) || n <= 0 || !unit.trim())
                throw new Error(
                  "Enter a name, a positive quantity and a unit.",
                );
              await commit((s) => ({
                ...s,
                checked: [],
                pantry: [
                  ...s.pantry,
                  {
                    id: Crypto.randomUUID(),
                    name: name.trim(),
                    ...toMetric(n, unit),
                  },
                ],
              }));
              setName("");
              setQuantity("");
            })
          }
        />
      </Card>
      {task.status}
      {data.pantry.map((i) => (
        <Card key={i.id}>
          <Copy>
            {i.name} — {formatQuantity(i.quantity, i.unit)}
          </Copy>
          <Action
            secondary
            label="Remove from pantry"
            disabled={task.busy}
            onPress={() =>
              task.run(() =>
                commit((s) => ({
                  ...s,
                  checked: [],
                  pantry: s.pantry.filter((p) => p.id !== i.id),
                })),
              )
            }
          />
        </Card>
      ))}
      <Card>
        <Title>Cook with what we have</Title>
        <Choice
          value={meal}
          options={(["breakfast", "lunch", "dinner"] as Meal[]).map((m) => ({
            value: m,
            label: mealLabels[m],
          }))}
          onChange={setMeal}
        />
        <Action
          label="Suggest a recipe ✨"
          disabled={task.busy || !household || !data.pantry.length}
          onPress={() =>
            task.run(async () => {
              setSuggestion(
                await suggestRecipe(
                  {
                    preferences: data.preferences,
                    recipes: receipes,
                    pantry: data.pantry,
                    feedback: data.feedback,
                  },
                  meal,
                ),
              );
              setSaved(false);
            })
          }
        />
      </Card>
      {suggestion && (
        <MealCard recipe={suggestion} servings={suggestion.servings}>
          <Action
            label={saved ? "Saved to recipes" : "Save to recipes"}
            disabled={task.busy || saved}
            onPress={() =>
              task.run(async () => {
                await addReceipe(suggestion);
                setSaved(true);
              })
            }
          />
        </MealCard>
      )}
    </Page>
  );
}
