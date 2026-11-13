import { Text, Pressable } from "react-native";
import { shareText } from "@/lib/share";
import { useKitchenStore } from "@/store/kitchen-store";
import { shoppingList, formatQuantity } from "@/domain/cooking";
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
      {list.map((i) => {
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
                {checked ? "☑" : "☐"} {i.name} —{" "}
                {i.quantity === null
                  ? `${i.manual || "to taste"} · check manually`
                  : formatQuantity(i.quantity, i.unit)}
              </Text>
              <Text style={ui.small}>{i.recipes.join(" · ")}</Text>
            </Card>
          </Pressable>
        );
      })}
      {!!list.length && (
        <Action
          secondary
          label="Share list"
          onPress={() =>
            task.run(() =>
              shareText(
                "CookBuddy · Shopping list\n" +
                  list
                    .map(
                      (i) =>
                        `${data.checked.includes(i.key) ? "✓" : "☐"} ${i.name}: ${i.quantity === null ? (i.manual || "to taste") + " (check manually)" : formatQuantity(i.quantity, i.unit)}`,
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
