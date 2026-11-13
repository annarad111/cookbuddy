import { useState, useEffect } from "react";
import { Image, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useReceipeStore } from "@/store/receipe-store";
import { useKitchenStore } from "@/store/kitchen-store";
import { useAuthStore } from "@/store/auth-store";
import { scaledIngredient, mealLabels } from "@/domain/cooking";
import { estimateCalories } from "@/domain/nutrition";
import { estimateCaloriesAI } from "@/lib/cooking-ai";
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
export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receipes, fetchReceipes, updateReceipe, removeReceipe } =
    useReceipeStore();
  const recipe = receipes.find((r) => r.id === id);
  const { data, commit, household } = useKitchenStore();
  const user = useAuthStore((s) => s.session?.user);
  const [servingsText, setServingsText] = useState(
    String(recipe?.servings || 2),
  );
  const servings = Math.max(
    1,
    Math.min(100, Math.round(Number(servingsText) || recipe?.servings || 1)),
  );
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState("5");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const task = useTask();
  const caloriesTask = useTask();
  useEffect(() => {
    if (!recipe) void fetchReceipes();
  }, [id]);
  useEffect(() => {
    if (recipe) setServingsText(String(recipe.servings));
  }, [recipe?.id]);
  if (!recipe)
    return (
      <Page>
        <Action
          secondary
          label="Înapoi la rețete"
          onPress={() => router.replace("/")}
        />
        <Copy>Rețeta nu a fost găsită sau încă se încarcă.</Copy>
      </Page>
    );
  return (
    <Page>
      <Action
        secondary
        label="Înapoi la rețete"
        onPress={() => router.replace("/")}
      />
      <Title>{recipe.title}</Title>
      {!!recipe.image_url && (
        <Image
          source={{ uri: recipe.image_url }}
          style={{ width: "100%", height: 240, borderRadius: 20 }}
        />
      )}
      <Copy>
        {recipe.time} minute ·{" "}
        {recipe.meal_type && recipe.meal_type !== "any"
          ? mealLabels[recipe.meal_type]
          : "Orice masă"}{" "}
        · {recipe.servings} porții în rețeta de bază
        {recipe.calories != null
          ? ` · ≈ ${recipe.calories} kcal/porție`
          : ""}
      </Copy>
      {recipe.calories == null && (
        <Card>
          <Text style={ui.label}>Caloriile nu sunt completate</Text>
          <View style={ui.row}>
            <Action
              secondary
              label="Calculează din ingrediente"
              disabled={caloriesTask.busy}
              onPress={() =>
                caloriesTask.run(async () => {
                  const e = estimateCalories(recipe);
                  if (e.perServing == null)
                    throw new Error(
                      `Nu pot calcula pentru: ${e.unknown.join(", ")}. Folosește AI sau editează rețeta.`,
                    );
                  await updateReceipe(recipe.id, { calories: e.perServing });
                  return `Salvat: ≈ ${e.perServing} kcal/porție.`;
                })
              }
            />
            <Action
              secondary
              label="Estimează cu AI ✨"
              disabled={caloriesTask.busy}
              onPress={() =>
                caloriesTask.run(async () => {
                  const r = await estimateCaloriesAI(recipe);
                  await updateReceipe(recipe.id, { calories: r.calories });
                  return `Salvat: ≈ ${r.calories} kcal/porție.${r.note ? " " + r.note : ""}`;
                })
              }
            />
          </View>
          {caloriesTask.status}
        </Card>
      )}
      <View style={ui.row}>
        <Action
          secondary
          label={recipe.is_favorite ? "♥ Favorită" : "♡ Adaugă la favorite"}
          disabled={task.busy}
          onPress={() =>
            task.run(() =>
              updateReceipe(recipe.id, { is_favorite: !recipe.is_favorite }),
            )
          }
        />
        <Action
          secondary
          label="Editează rețeta"
          onPress={() =>
            router.push({
              pathname: "/new-receipe",
              params: { edit: recipe.id },
            })
          }
        />
      </View>
      <Card>
        <Field
          label="Porții de pregătit"
          numeric
          value={servingsText}
          onChangeText={(v) => setServingsText(v.replace(/[^\d]/g, ""))}
        />
        {recipe.calories != null && (
          <Copy>
            ≈ {recipe.calories * servings} kcal pentru {servings}{" "}
            {servings === 1 ? "porție" : "porții"}
          </Copy>
        )}
        <Title>Ingrediente</Title>
        {recipe.ingredients.map((i) => (
          <Copy key={i.id}>
            {i.name} — {scaledIngredient(i, servings, recipe.servings)}
          </Copy>
        ))}
      </Card>
      <Card>
        <Title>Preparare</Title>
        {recipe.steps
          .split("\n")
          .filter(Boolean)
          .map((step, i) => (
            <Copy key={i}>
              {i + 1}. {step}
            </Copy>
          ))}
        {!!recipe.notes && (
          <>
            <Text style={ui.label}>Notițele rețetei</Text>
            <Copy>{recipe.notes}</Copy>
          </>
        )}
      </Card>
      <Card>
        <Title>Cum a ieșit?</Title>
        <Copy>
          Observațiile voastre sunt folosite la recomandările următoare.
        </Copy>
        <Choice
          value={rating}
          options={["1", "2", "3", "4", "5"].map((value) => ({
            value,
            label: `${value} ★`,
          }))}
          onChange={setRating}
        />
        <Field
          label="Comentariu (ex.: mai puțin sos data viitoare)"
          value={comment}
          onChangeText={setComment}
          multiline
        />
        <Action
          label="Salvează feedbackul"
          disabled={task.busy || !household}
          onPress={() =>
            task.run(async () => {
              await commit((s) => ({
                ...s,
                feedback: [
                  ...s.feedback,
                  {
                    id: Crypto.randomUUID(),
                    recipeId: recipe.id,
                    title: recipe.title,
                    author: user?.email?.split("@")[0] || "Noi",
                    rating: Number(rating),
                    comment: comment.slice(0, 2000),
                    createdAt: new Date().toISOString(),
                  },
                ].slice(-200),
              }));
              setComment("");
            }, "Feedback salvat.")
          }
        />
        {data.feedback
          .filter((f) => f.recipeId === recipe.id)
          .slice()
          .reverse()
          .map((f) => (
            <View key={f.id} style={{ gap: 4 }}>
              <Text style={ui.label}>
                {f.author} · {f.rating} ★ ·{" "}
                {new Date(f.createdAt).toLocaleDateString("ro-RO")}
              </Text>
              <Copy>{f.comment}</Copy>
            </View>
          ))}
      </Card>
      {task.status}
      {!confirmDelete ? (
        <Action
          secondary
          label="Șterge rețeta"
          onPress={() => setConfirmDelete(true)}
        />
      ) : (
        <Card>
          <Copy>
            Ștergi rețeta din registru? Mesele deja planificate păstrează copia
            lor.
          </Copy>
          <Action
            label="Da, șterge rețeta"
            disabled={task.busy}
            onPress={() =>
              task.run(async () => {
                await removeReceipe(recipe.id);
                router.replace("/");
              })
            }
          />
          <Action
            secondary
            label="Păstrează rețeta"
            onPress={() => setConfirmDelete(false)}
          />
        </Card>
      )}
    </Page>
  );
}
