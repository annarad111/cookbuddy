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
      <Title>Bucătăria voastră</Title>
      <Copy>{session?.user.email}</Copy>
      <Action
        secondary
        label="Încarcă / actualizează bucătăria"
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
            Introduceți același cod în cele două conturi pentru a folosi același
            registru, plan, cămară și aceeași listă de cumpărături. Codul oferă
            acces la bucătărie; trimite-l doar persoanei cu care vrei să o
            împarți.
          </Copy>
          <Text selectable style={ui.copy}>
            {household.invite_code}
          </Text>
          <Action
            secondary
            label="Distribuie codul"
            onPress={() =>
              task.run(() =>
                shareText(
                  `Codul bucătăriei noastre CookBuddy: ${household.invite_code}`,
                ),
              )
            }
          />
          {household.owner_id === session?.user.id && (
            <Action
              secondary
              label="Generează un cod nou"
              disabled={task.busy}
              onPress={() =>
                task.run(async () => {
                  const { error } = await supabase.rpc(
                    "cookbuddy_rotate_code",
                    { p_household: household.id },
                  );
                  if (error) throw new Error(error.message);
                  await load();
                }, "Codul vechi nu mai permite conectări noi. Membrii existenți își păstrează accesul.")
              }
            />
          )}
          <Action
            secondary
            label="Mută rețetele mele private în această bucătărie"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                const { error } = await supabase.rpc(
                  "cookbuddy_share_my_recipes",
                  { p_household: household.id },
                );
                if (error) throw new Error(error.message);
                await useReceipeStore.getState().fetchReceipes();
              }, "Rețetele tale sunt acum în registrul comun.")
            }
          />
        </Card>
      )}
      <Card>
        <Field
          label="Codul bucătăriei partenerului"
          value={code}
          onChangeText={setCode}
        />
        <Copy>
          Conectarea schimbă bucătăria activă. Rețetele private nu sunt mutate
          automat.
        </Copy>
        <Action
          label="Conectează-te la bucătărie"
          disabled={task.busy || !code.trim()}
          onPress={() =>
            task.run(async () => {
              await join(code);
              await useReceipeStore.getState().fetchReceipes();
              setCode("");
            }, "Sunteți conectați la aceeași bucătărie.")
          }
        />
      </Card>
      <Card>
        <Text style={ui.label}>Calorii pentru rețetele existente</Text>
        <Copy>
          Calculează din ingrediente caloriile pentru toate rețetele care nu le
          au încă. Nu folosește cereri AI. Pentru rețetele cu ingrediente
          necunoscute, deschide rețeta și folosește „Estimează cu AI”.
        </Copy>
        <Action
          secondary
          label="Calculează caloriile lipsă"
          disabled={task.busy}
          onPress={() =>
            task.run(async () => {
              const store = useReceipeStore.getState();
              const missing = store.receipes.filter((r) => r.calories == null);
              if (!missing.length) return "Toate rețetele au deja calorii.";
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
                `Calculat pentru ${done} ${done === 1 ? "rețetă" : "rețete"}.` +
                (skipped.length
                  ? ` Necesită AI sau editare: ${skipped.join(", ")}.`
                  : "")
              );
            })
          }
        />
      </Card>
      <Card>
        <Text style={ui.label}>Despre recomandările AI</Text>
        <Copy>
          CookBuddy folosește exclusiv modele gratuite OpenRouter. Se trimit
          preferințele, rețetele relevante, cămara și ultimele observații
          culinare. Limita aplicației: 20 de cereri/zi pentru fiecare cont.
          Disponibilitatea depinde și de limita contului OpenRouter.
        </Copy>
        <Copy>
          Ingredientele excluse se verifică după denumire; revizuiește
          întotdeauna etichetele dacă există alergii. Cantitățile ilizibile din
          import necesită verificare manuală.
        </Copy>
      </Card>
      <Action
        secondary
        label="Deconectare"
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
