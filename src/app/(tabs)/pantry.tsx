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
  canonicalUnit,
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
      <Title>Ce avem în casă?</Title>
      <Copy>
        Folosește aceeași denumire ca în rețete pentru scăderea corectă din
        cumpărături. Actualizează cantitățile după ce gătiți.
      </Copy>
      <Card>
        <Field label="Ingredient" value={name} onChangeText={setName} />
        <View style={ui.row}>
          <View style={{ flex: 1 }}>
            <Field
              label="Cantitate"
              value={quantity}
              numeric
              onChangeText={setQuantity}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Unitate (g, kg, ml, l, buc)"
              value={unit}
              onChangeText={setUnit}
            />
          </View>
        </View>
        <Action
          label="Adaugă în cămară"
          disabled={task.busy || !household}
          onPress={() =>
            task.run(async () => {
              const n = Number(quantity.replace(",", "."));
              if (!name.trim() || !Number.isFinite(n) || n <= 0 || !unit.trim())
                throw new Error(
                  "Completează denumirea, o cantitate pozitivă și unitatea.",
                );
              await commit((s) => ({
                ...s,
                checked: [],
                pantry: [
                  ...s.pantry,
                  {
                    id: Crypto.randomUUID(),
                    name: name.trim(),
                    quantity: n,
                    unit: canonicalUnit(unit),
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
            label="Elimină din cămară"
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
        <Title>Gătim cu ce avem</Title>
        <Choice
          value={meal}
          options={(["breakfast", "lunch", "dinner"] as Meal[]).map((m) => ({
            value: m,
            label: mealLabels[m],
          }))}
          onChange={setMeal}
        />
        <Action
          label="Propune o rețetă ✨"
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
            label={saved ? "Salvată în registru" : "Salvează în registru"}
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
