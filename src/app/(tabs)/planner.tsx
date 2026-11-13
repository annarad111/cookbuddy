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
import { confirmAction } from "@/lib/confirm";

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
      throw new Error("Choose 1–12 people, 1–7 days and 5–180 minutes.");
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
      <Title>What are we cooking?</Title>
      <Copy>
        A simple plan with quantities and shopping calculated automatically.
      </Copy>
      {!!error && <Copy>{error}</Copy>}
      <Action
        secondary
        label={loading ? "Loading…" : "Refresh kitchen"}
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
              label="People"
              value={String(p.people || "")}
              numeric
              onChangeText={(v) => set({ people: Number(v) })}
            />
          </View>
          <View style={{ flex: 1, minWidth: 100 }}>
            <Field
              label="Days"
              value={String(p.days || "")}
              numeric
              onChangeText={(v) => set({ days: Number(v) })}
            />
          </View>
        </View>
        <Field
          label="Max time per recipe (minutes)"
          numeric
          value={String(p.maxMinutes || "")}
          onChangeText={(v) => set({ maxMinutes: Number(v) })}
        />
        <Field
          label="Preferences (e.g. high protein, simple dishes)"
          value={p.preferences}
          onChangeText={(v) => set({ preferences: v })}
          multiline
        />
        <Field
          label="Excluded ingredients, comma separated"
          value={p.excluded}
          onChangeText={(v) => set({ excluded: v })}
        />
        <View
          style={[
            ui.row,
            { alignItems: "center", justifyContent: "space-between" },
          ]}
        >
          <Copy>Repeat meals for batch cooking</Copy>
          <Switch
            accessibilityLabel="Repeat meals"
            value={p.repeatMeals}
            onValueChange={(v) => set({ repeatMeals: v })}
          />
        </View>
        <Choice
          value={p.source}
          options={[
            { value: "mixed", label: "Mix" },
            { value: "saved", label: "My recipes" },
            { value: "new", label: "New ideas" },
          ]}
          onChange={(v) => set({ source: v })}
        />
        {!!data.plan.length && (
          <Copy>
            Generating a new plan replaces the current one and clears the shopping checkmarks.
          </Copy>
        )}
        <Action
          label="Suggest a plan with AI ✨"
          disabled={task.busy || !household}
          onPress={() =>
            task.run(() => build(true), "Plan saved to your kitchen.")
          }
        />
        <Action
          secondary
          label="Plan from my recipes · no AI"
          disabled={task.busy || !household}
          onPress={() => task.run(() => build(false))}
        />
      </Card>
      {task.status}
      {!household && (
        <Copy>
          Set up the kitchen in Profile. Your existing recipes stay available.
        </Copy>
      )}
      {data.plan.length > 0 && (
        <>
          <Title>Your plan</Title>
          <Action
            secondary
            label="Clear plan"
            disabled={task.busy || !household}
            onPress={() =>
              task.run(async () => {
                const ok = await confirmAction(
                  "Clear the plan?",
                  "All planned meals and shopping checkmarks will be removed for both of you. Your recipes are not affected.",
                  "Clear",
                );
                if (!ok) return;
                await commit((s) => ({
                  ...s,
                  plan: [],
                  checked: [],
                  planCreatedAt: undefined,
                }));
                setManualEntry(null);
                return "Plan cleared.";
              })
            }
          />
        </>
      )}
      {data.plan.map((entry, index) => (
        <View key={entry.id} style={{ gap: 10 }}>
          {data.plan[index - 1]?.day !== entry.day && (
            <DayCalories plan={data.plan} day={entry.day} />
          )}
          <Text style={ui.label}>
            Day {entry.day} · {mealLabels[entry.meal]}
          </Text>
          <MealCard recipe={entry.recipe} servings={entry.servings}>
            <View style={ui.row}>
              <Action
                secondary
                label="− 1 serving"
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
                label="+ 1 serving"
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
              label="Replace with an AI idea"
              disabled={task.busy}
              onPress={() => task.run(() => replace(entry.id))}
            />
            <Action
              secondary
              label="Pick from my recipes"
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
                  Don't see your recipe? Check its meal type, time and excluded ingredients.
                </Copy>
              </View>
            )}
            {!receipes.some((r) => r.id === entry.recipe.id) && (
              <Action
                label="Save recipe to my collection"
                disabled={task.busy}
                onPress={() =>
                  task.run(() => save(entry.recipe), "Recipe saved.")
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
      Day {day} · ≈ {perPerson} kcal/person
      {missing ? ` (${missing} ${missing === 1 ? "meal" : "meals"} without calories)` : ""}
    </Text>
  );
}
