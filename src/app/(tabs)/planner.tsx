import { useEffect, useState } from "react";
import { Text, View, Switch } from "react-native";
import { useKitchenStore } from "@/store/kitchen-store";
import { useReceipeStore } from "@/store/receipe-store";
import {
  Preferences,
  localPlan,
  mealLabels,
  Recipe,
  Meal,
  excludedRecipe,
} from "@/domain/cooking";
import { generatePlan, suggestRecipe } from "@/lib/cooking-ai";
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
import { dayCalories } from "@/domain/nutrition";

export default function Planner() {
  const { data, household, loading, error, commit, load } = useKitchenStore();
  const { receipes, fetchReceipes, addReceipe } = useReceipeStore();
  const [p, setP] = useState<Preferences>(data.preferences);
  const [manualEntry, setManualEntry] = useState<string | null>(null);
  const task = useTask();
  useEffect(() => {
    setP(data.preferences);
  }, [data.preferences]);
  const set = (fields: Partial<Preferences>) =>
    setP((current) => ({ ...current, ...fields }));
  function validate() {
    if (
      !Number.isInteger(p.people) ||
      p.people < 1 ||
      p.people > 12 ||
      !Number.isInteger(p.days) ||
      p.days < 1 ||
      p.days > 7 ||
      !Number.isInteger(p.maxMinutes) ||
      p.maxMinutes < 5 ||
      p.maxMinutes > 180
    )
      throw new Error("Alege 1–12 persoane, 1–7 zile și 5–180 minute.");
  }
  const context = () => ({
    preferences: p,
    recipes: receipes,
    pantry: data.pantry,
    feedback: data.feedback,
  });
  async function build(ai: boolean) {
    validate();
    const plan =
      ai && p.source !== "saved"
        ? await generatePlan(context())
        : localPlan(receipes, p);
    await commit((s) => ({
      ...s,
      preferences: p,
      plan,
      checked: [],
      planCreatedAt: new Date().toISOString(),
    }));
  }
  async function replace(id: string, recipe?: Recipe) {
    const entry = useKitchenStore.getState().data.plan.find((e) => e.id === id);
    if (!entry) return;
    const replacement =
      recipe ||
      (await suggestRecipe(
        { ...context(), preferences: data.preferences },
        entry.meal,
        entry.recipe.title,
      ));
    await commit((s) => ({
      ...s,
      plan: s.plan.map((e) =>
        e.id === id ? { ...e, recipe: replacement } : e,
      ),
      checked: [],
    }));
    setManualEntry(null);
  }
  async function save(recipe: Recipe) {
    const saved = await addReceipe(recipe);
    await commit((s) => ({
      ...s,
      plan: s.plan.map((e) =>
        e.recipe.id === recipe.id ? { ...e, recipe: saved } : e,
      ),
    }));
  }
  return (
    <Page>
      <Title>Ce gătim împreună?</Title>
      <Copy>
        Un plan simplu pentru voi, cu cantități și cumpărături calculate
        automat.
      </Copy>
      {!!error && <Copy>{error}</Copy>}
      <Action
        secondary
        label={loading ? "Se încarcă…" : "Actualizează bucătăria"}
        disabled={task.busy || loading}
        onPress={() =>
          task.run(async () => {
            await load();
            await fetchReceipes();
          })
        }
      />
      <Card>
        <View style={ui.row}>
          <View style={{ flex: 1, minWidth: 100 }}>
            <Field
              label="Persoane"
              value={String(p.people || "")}
              numeric
              onChangeText={(v) => set({ people: Number(v) })}
            />
          </View>
          <View style={{ flex: 1, minWidth: 100 }}>
            <Field
              label="Zile"
              value={String(p.days || "")}
              numeric
              onChangeText={(v) => set({ days: Number(v) })}
            />
          </View>
        </View>
        <Field
          label="Timp maxim per rețetă (minute)"
          numeric
          value={String(p.maxMinutes || "")}
          onChangeText={(v) => set({ maxMinutes: Number(v) })}
        />
        <Field
          label="Preferințe (ex.: bogat în proteine, preparate simple)"
          value={p.preferences}
          onChangeText={(v) => set({ preferences: v })}
          multiline
        />
        <Field
          label="Ingrediente excluse, separate prin virgulă"
          value={p.excluded}
          onChangeText={(v) => set({ excluded: v })}
        />
        <View
          style={[
            ui.row,
            { alignItems: "center", justifyContent: "space-between" },
          ]}
        >
          <Copy>Repetă mese pentru gătit în avans</Copy>
          <Switch
            accessibilityLabel="Repetă mesele"
            value={p.repeatMeals}
            onValueChange={(v) => set({ repeatMeals: v })}
          />
        </View>
        <Choice
          value={p.source}
          options={[
            { value: "mixed", label: "Mix" },
            { value: "saved", label: "Din registru" },
            { value: "new", label: "Idei noi" },
          ]}
          onChange={(v) => set({ source: v })}
        />
        {!!data.plan.length && (
          <Copy>
            Generarea unui plan nou înlocuiește planul curent și resetează
            bifele de cumpărături.
          </Copy>
        )}
        <Action
          label="Propune planul cu AI ✨"
          disabled={task.busy || !household}
          onPress={() =>
            task.run(() => build(true), "Plan salvat în bucătăria voastră.")
          }
        />
        <Action
          secondary
          label="Plan din registru · fără AI"
          disabled={task.busy || !household}
          onPress={() => task.run(() => build(false))}
        />
      </Card>
      {task.status}
      {!household && (
        <Copy>
          Configurează bucătăria din Profil. Rețetele existente rămân
          disponibile.
        </Copy>
      )}
      {data.plan.length > 0 && <Title>Planul vostru</Title>}
      {data.plan.map((entry, index) => (
        <View key={entry.id} style={{ gap: 10 }}>
          {data.plan[index - 1]?.day !== entry.day && (
            <DayCalories plan={data.plan} day={entry.day} />
          )}
          <Text style={ui.label}>
            Ziua {entry.day} · {mealLabels[entry.meal]}
          </Text>
          <MealCard recipe={entry.recipe} servings={entry.servings}>
            <View style={ui.row}>
              <Action
                secondary
                label="− o porție"
                disabled={task.busy || entry.servings <= 1}
                onPress={() =>
                  task.run(() =>
                    commit((s) => ({
                      ...s,
                      checked: [],
                      plan: s.plan.map((e) =>
                        e.id === entry.id
                          ? { ...e, servings: e.servings - 1 }
                          : e,
                      ),
                    })),
                  )
                }
              />
              <Action
                secondary
                label="+ o porție"
                disabled={task.busy || entry.servings >= 100}
                onPress={() =>
                  task.run(() =>
                    commit((s) => ({
                      ...s,
                      checked: [],
                      plan: s.plan.map((e) =>
                        e.id === entry.id
                          ? { ...e, servings: e.servings + 1 }
                          : e,
                      ),
                    })),
                  )
                }
              />
            </View>
            <Action
              secondary
              label="Înlocuiește cu o idee AI"
              disabled={task.busy}
              onPress={() => task.run(() => replace(entry.id))}
            />
            <Action
              secondary
              label="Alege din registru"
              disabled={task.busy}
              onPress={() =>
                setManualEntry(manualEntry === entry.id ? null : entry.id)
              }
            />
            {manualEntry === entry.id && (
              <View style={{ gap: 8 }}>
                {receipes
                  .filter(
                    (r) =>
                      (r.meal_type === entry.meal || r.meal_type === "any") &&
                      !excludedRecipe(r, data.preferences.excluded) &&
                      r.time <= data.preferences.maxMinutes,
                  )
                  .map((r) => (
                    <Action
                      key={r.id}
                      secondary
                      label={r.title}
                      disabled={task.busy}
                      onPress={() => task.run(() => replace(entry.id, r))}
                    />
                  ))}
                <Copy>
                  Nu vezi rețeta? Verifică tipul mesei, timpul și ingredientele
                  excluse.
                </Copy>
              </View>
            )}
            {!receipes.some((r) => r.id === entry.recipe.id) && (
              <Action
                label="Salvează rețeta în registru"
                disabled={task.busy}
                onPress={() =>
                  task.run(() => save(entry.recipe), "Rețeta a fost salvată.")
                }
              />
            )}
          </MealCard>
        </View>
      ))}
    </Page>
  );
}

function DayCalories({
  plan,
  day,
}: {
  plan: { day: number; recipe: Recipe }[];
  day: number;
}) {
  const { perPerson, missing } = dayCalories(plan, day);
  if (!perPerson && missing) return null;
  return (
    <Text style={[ui.title, { fontSize: 19, marginTop: 8 }]}>
      Ziua {day} · ≈ {perPerson} kcal/persoană
      {missing ? ` (fără ${missing} ${missing === 1 ? "masă" : "mese"})` : ""}
    </Text>
  );
}
