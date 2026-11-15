import { Text, Pressable } from "react-native";
import * as Crypto from "expo-crypto";
import { shareText } from "@/lib/share";
import { confirmAction } from "@/lib/confirm";
import { View } from "react-native";
import { useKitchenStore } from "@/store/kitchen-store";
import {
  shoppingList,
  formatShoppingAmount,
  ingredientKey,
  baseQuantity,
  type ShoppingItem,
} from "@/domain/cooking";
import { AISLES, aisleFor } from "@/domain/nutrition";
import {
  Action,
  Card,
  Copy,
  Page,
  Title,
  ui,
  useTask,
} from "@/components/KitchenUI";
export default function Shopping() {
  const { data, commit, load } = useKitchenStore();
  const task = useTask();
  const list = shoppingList(data.plan, data.pantry);
  // Supermarket order: one section per aisle, empty aisles hidden.
  const sections = AISLES.map(
    (aisle) => [aisle, list.filter((i) => aisleFor(i.name) === aisle)] as const,
  ).filter(([, items]) => items.length);
  const boughtWithAmounts = list.filter(
    (i) => data.checked.includes(i.key) && i.amounts.length,
  );
  function renderItem(i: ShoppingItem) {
    const checked = data.checked.includes(i.key);
    return (
      <Pressable
        key={i.key}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        disabled={task.busy}
        onPress={() =>
          task.run(() =>
            commit((s) => ({
              ...s,
              checked: checked
                ? s.checked.filter((k) => k !== i.key)
                : [...s.checked, i.key],
            })),
          )
        }
      >
        <Card>
          <Text
            style={[
              ui.label,
              checked && {
                textDecorationLine: "line-through",
                opacity: 0.5,
              },
            ]}
          >
            {checked ? "☑" : "☐"} {i.name} — {formatShoppingAmount(i)}
          </Text>
          <Text style={ui.small}>{i.recipes.join(" · ")}</Text>
        </Card>
      </Pressable>
    );
  }
  return (
    <Page>
      <Title>Shopping list</Title>
      <Copy>
        Quantities add up every meal and serving in the plan. Pantry items are already subtracted. Only identical names with compatible units are combined.
      </Copy>
      <Action
        secondary
        label="Refresh shared list"
        disabled={task.busy}
        onPress={() => task.run(load)}
      />
      {task.status}
      {!data.plan.length && (
        <Card>
          <Copy>Create a meal plan first.</Copy>
        </Card>
      )}
      {!!data.plan.length && !list.length && (
        <Card>
          <Copy>You already have every ingredient in the pantry.</Copy>
        </Card>
      )}
      {!!data.plan.length && (
        <View style={ui.row}>
          <Action
            secondary
            label="Uncheck all"
            disabled={task.busy || !data.checked.length}
            onPress={() =>
              task.run(async () => {
                await commit((s) => ({ ...s, checked: [] }));
                return "All items unchecked.";
              })
            }
          />
          <Action
            secondary
            label="Move bought to pantry"
            disabled={task.busy || !boughtWithAmounts.length}
            onPress={() =>
              task.run(async () => {
                const moved = boughtWithAmounts;
                await commit((s) => {
                  const pantry = s.pantry.map((p) => ({ ...p }));
                  for (const item of moved)
                    for (const a of item.amounts) {
                      // Add to an existing pantry row of the same ingredient and unit family.
                      const existing = pantry.find(
                        (p) =>
                          ingredientKey(p.name) === item.key &&
                          baseQuantity(p.quantity, p.unit).unit === a.unit,
                      );
                      if (existing) {
                        const base = baseQuantity(existing.quantity, existing.unit);
                        existing.quantity =
                          Math.round((base.quantity + a.quantity) * 100) / 100;
                        existing.unit = base.unit;
                      } else
                        pantry.push({
                          id: Crypto.randomUUID(),
                          name: item.name,
                          quantity: Math.round(a.quantity * 100) / 100,
                          unit: a.unit,
                        });
                    }
                  const keys = new Set(moved.map((i) => i.key));
                  return {
                    ...s,
                    pantry,
                    checked: s.checked.filter((k) => !keys.has(k)),
                  };
                });
                return `Moved ${moved.length} ${moved.length === 1 ? "item" : "items"} to the pantry.`;
              })
            }
          />
          <Action
            secondary
            label="Clear list"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                const ok = await confirmAction(
                  "Clear the shopping list?",
                  "The list is built from your meal plan, so this also clears the plan for both of you. Your recipes and pantry are not affected.",
                  "Clear",
                );
                if (!ok) return;
                await commit((s) => ({
                  ...s,
                  plan: [],
                  checked: [],
                  planCreatedAt: undefined,
                }));
                return "Shopping list and plan cleared.";
              })
            }
          />
        </View>
      )}
      {sections.map(([aisle, items]) => (
        <View key={aisle} style={{ gap: 10 }}>
          <Text style={[ui.title, { fontSize: 19, marginTop: 4 }]}>{aisle}</Text>
          {items.map(renderItem)}
        </View>
      ))}
      {!!list.length && (
        <Action
          secondary
          label="Share list"
          onPress={() =>
            task.run(() =>
              shareText(
                "CookBuddy · Shopping list\n" +
                  sections
                    .map(
                      ([aisle, items]) =>
                        `\n${aisle}\n` +
                        items
                          .map(
                            (i) =>
                              `${data.checked.includes(i.key) ? "✓" : "☐"} ${i.name}: ${formatShoppingAmount(i)}`,
                          )
                          .join("\n"),
                    )
                    .join("\n"),
              ),
            )
          }
        />
      )}
      {!!data.plan.length && (
        <Card>
          <Text style={ui.label}>To cook for the whole plan</Text>
          {Object.entries(
            data.plan.reduce<Record<string, number>>((acc, e) => {
              acc[e.recipe.title] = (acc[e.recipe.title] || 0) + e.servings;
              return acc;
            }, {}),
          ).map(([title, count]) => (
            <Copy key={title}>
              {title}: {count} servings in total
            </Copy>
          ))}
        </Card>
      )}
    </Page>
  );
}
