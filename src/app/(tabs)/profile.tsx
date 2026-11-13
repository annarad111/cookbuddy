import { useState } from "react";
import { Text } from "react-native";
import { shareText } from "@/lib/share";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";
import { useKitchenStore } from "@/store/kitchen-store";
import { useReceipeStore } from "@/store/receipe-store";
import { estimateCalories } from "@/domain/nutrition";
import {
  Action,
  Card,
  Copy,
  Field,
  Page,
  Title,
  ui,
  useTask,
} from "@/components/KitchenUI";
export default function Profile() {
  const session = useAuthStore((s) => s.session);
  const { household, load, join, error } = useKitchenStore();
  const [code, setCode] = useState("");
  const task = useTask();
  return (
    <Page>
      <Title>Your kitchen</Title>
      <Copy>{session?.user.email}</Copy>
      <Action
        secondary
        label="Load / refresh kitchen"
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            await load();
            await useReceipeStore.getState().fetchReceipes();
          })
        }
      />
      {!!error && <Copy>{error}</Copy>}
      {task.status}
      {household && (
        <Card>
          <Text style={ui.label}>{household.name}</Text>
          <Copy>
            Use the same code on both accounts to share the same recipes, plan, pantry and shopping list. The code gives access to the kitchen; only send it to the person you want to share it with.
          </Copy>
          <Text selectable style={ui.copy}>
            {household.invite_code}
          </Text>
          <Action
            secondary
            label="Share code"
            onPress={() =>
              task.run(() =>
                shareText(
                  `Our CookBuddy kitchen code: ${household.invite_code}`,
                ),
              )
            }
          />
          {household.owner_id === session?.user.id && (
            <Action
              secondary
              label="Generate a new code"
              disabled={task.busy}
              onPress={() =>
                task.run(async () => {
                  const { error } = await supabase.rpc(
                    "cookbuddy_rotate_code",
                    { p_household: household.id },
                  );
                  if (error) throw new Error(error.message);
                  await load();
                }, "The old code no longer allows new members. Existing members keep their access.")
              }
            />
          )}
          <Action
            secondary
            label="Move my private recipes into this kitchen"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                const { error } = await supabase.rpc(
                  "cookbuddy_share_my_recipes",
                  { p_household: household.id },
                );
                if (error) throw new Error(error.message);
                await useReceipeStore.getState().fetchReceipes();
              }, "Your recipes are now in the shared collection.")
            }
          />
        </Card>
      )}
      <Card>
        <Field
          label="Partner's kitchen code"
          value={code}
          onChangeText={setCode}
        />
        <Copy>
          Joining switches your active kitchen. Private recipes are not moved automatically.
        </Copy>
        <Action
          label="Join kitchen"
          disabled={task.busy || !code.trim()}
          onPress={() =>
            task.run(async () => {
              await join(code);
              await useReceipeStore.getState().fetchReceipes();
              setCode("");
            }, "You are now in the same kitchen.")
          }
        />
      </Card>
      <Card>
        <Text style={ui.label}>Calories for existing recipes</Text>
        <Copy>
          Calculates calories from the ingredients for every recipe that doesn't have them yet. Uses no AI requests. For recipes with unknown ingredients, open the recipe and use "Estimate with AI".
        </Copy>
        <Action
          secondary
          label="Calculate missing calories"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const store = useReceipeStore.getState();
              const missing = store.receipes.filter((r) => r.calories == null);
              if (!missing.length) return "Every recipe already has calories.";
              const skipped: string[] = [];
              let done = 0;
              for (const r of missing) {
                const e = estimateCalories(r);
                if (e.perServing == null) skipped.push(r.title);
                else {
                  await store.updateReceipe(r.id, { calories: e.perServing });
                  done++;
                }
              }
              return (
                `Calculated for ${done} ${done === 1 ? "recipe" : "recipes"}.` +
                (skipped.length
                  ? ` Need AI or editing: ${skipped.join(", ")}.`
                  : "")
              );
            })
          }
        />
      </Card>
      <Card>
        <Text style={ui.label}>About AI suggestions</Text>
        <Copy>
          CookBuddy only uses free OpenRouter models. Your preferences, relevant recipes, pantry and recent cooking feedback are sent. App limit: 20 requests per day per account. Availability also depends on the OpenRouter account limit.
        </Copy>
        <Copy>
          Excluded ingredients are matched by name; always check labels if there are allergies. Unreadable quantities from imports need a manual check.
        </Copy>
      </Card>
      <Action
        secondary
        label="Log out"
        disabled={task.busy}
        onPress={() =>
          task.run(async () => {
            const { error } = await supabase.auth.signOut();
            if (error) throw new Error(error.message);
          })
        }
      />
    </Page>
  );
}
