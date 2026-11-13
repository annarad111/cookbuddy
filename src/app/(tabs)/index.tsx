import { useState } from "react";
import { View, TextInput, Text } from "react-native";
import { router } from "expo-router";
import { useReceipeStore } from "@/store/receipe-store";
import { useKitchenStore } from "@/store/kitchen-store";
import { Meal, mealLabels, normalize } from "@/domain/cooking";
import RecipeList from "@/components/RecipeList";
import { Action, Choice, ui, useTask } from "@/components/KitchenUI";
export default function HomeScreen() {
  const { receipes, error, loading, fetchReceipes } = useReceipeStore();
  const kitchenError = useKitchenStore((s) => s.error);
  const [search, setSearch] = useState("");
  const [meal, setMeal] = useState<Meal | "all">("all");
  const task = useTask();
  const filtered = receipes.filter(
    (r) =>
      normalize(r.title).includes(normalize(search)) &&
      (meal === "all" || r.meal_type === meal || r.meal_type === "any"),
  );
  return (
    <View style={{ flex: 1, backgroundColor: "#fff6ef" }}>
      <View
        style={{
          padding: 18,
          gap: 12,
          width: "100%",
          maxWidth: 900,
          alignSelf: "center",
        }}
      >
        <Text style={ui.title}>Registrul vostru de rețete</Text>
        <TextInput
          style={ui.input}
          accessibilityLabel="Caută o rețetă"
          placeholder="Caută o rețetă…"
          value={search}
          onChangeText={setSearch}
        />
        <Choice
          value={meal}
          options={[
            { value: "all", label: "Toate" },
            ...(["breakfast", "lunch", "dinner"] as Meal[]).map((value) => ({
              value: value as Meal | "all",
              label: mealLabels[value],
            })),
          ]}
          onChange={setMeal}
        />
        <View style={ui.row}>
          <Action
            secondary
            label="♥ Favorite"
            onPress={() => router.push("/favorites")}
          />
          <Action
            label="+ Rețetă"
            onPress={() => router.push("/new-receipe")}
          />
          <Action
            secondary
            label="Import cu AI ✨"
            onPress={() => router.push("/import-recipe")}
          />
          <Action
            secondary
            label={loading ? "Se încarcă…" : "Actualizează"}
            disabled={task.busy || loading}
            onPress={() => task.run(fetchReceipes)}
          />
        </View>
        {!!(error || kitchenError) && (
          <Text style={ui.message}>{error || kitchenError}</Text>
        )}
        {task.status}
      </View>
      <RecipeList
        data={filtered}
        emptyMessage={
          loading
            ? "Se încarcă rețetele…"
            : "Nicio rețetă aici încă.\nAdaugă una sau import-o cu AI."
        }
      />
    </View>
  );
}
