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
      <Title>Lista de cumpărături</Title>
      <Copy>
        Cantitățile însumează toate mesele și porțiile din plan. Ingredientele
        din cămară sunt deja scăzute. Se combină doar denumirile identice și
        unitățile compatibile.
      </Copy>
      <Action
        secondary
        label="Actualizează lista comună"
        disabled={task.busy}
        onPress={() => task.run(load)}
      />
      {task.status}
      {!data.plan.length && (
        <Card>
          <Copy>Creează întâi un plan de mese.</Copy>
        </Card>
      )}
      {!!data.plan.length && !list.length && (
        <Card>
          <Copy>Ai deja toate ingredientele în cămară.</Copy>
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
                  ? `${i.manual || "după gust"} · verifică manual`
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
          label="Distribuie lista"
          onPress={() =>
            task.run(() =>
              shareText(
                "CookBuddy · Lista de cumpărături\n" +
                  list
                    .map(
                      (i) =>
                        `${data.checked.includes(i.key) ? "✓" : "☐"} ${i.name}: ${i.quantity === null ? (i.manual || "după gust") + " (verifică manual)" : formatQuantity(i.quantity, i.unit)}`,
                    )
                    .join("\n"),
              ),
            )
          }
        />
      )}
      {!!data.plan.length && (
        <Card>
          <Text style={ui.label}>De gătit pentru tot planul</Text>
          {Object.entries(
            data.plan.reduce<Record<string, number>>((acc, e) => {
              acc[e.recipe.title] = (acc[e.recipe.title] || 0) + e.servings;
              return acc;
            }, {}),
          ).map(([title, count]) => (
            <Copy key={title}>
              {title}: {count} porții în total
            </Copy>
          ))}
        </Card>
      )}
    </Page>
  );
}
