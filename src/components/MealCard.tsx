import { useState } from "react";
import { Text, View } from "react-native";
import { Recipe, scaledIngredient, mealLabels } from "@/domain/cooking";
import { Action, Card, Copy, ui } from "./KitchenUI";
export default function MealCard({
  recipe,
  servings,
  children,
}: {
  recipe: Recipe;
  servings: number;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Text style={[ui.title, { fontSize: 21 }]}>{recipe.title}</Text>
      <Copy>
        {recipe.meal_type && recipe.meal_type !== "any"
          ? mealLabels[recipe.meal_type] + " · "
          : ""}
        {recipe.time} min · {servings} servings
        {recipe.calories != null
          ? ` · ≈ ${recipe.calories} kcal/serving`
          : ""}
      </Copy>
      <Action
        secondary
        label={open ? "Hide recipe" : "Show ingredients and steps"}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <View style={{ gap: 8 }}>
          {recipe.ingredients.map((i) => (
            <Text key={i.id} style={ui.copy}>
              {i.name} — {scaledIngredient(i, servings, recipe.servings)}
            </Text>
          ))}
          <Text style={ui.copy}>{recipe.steps}</Text>
          {!!recipe.notes && <Copy>{recipe.notes}</Copy>}
        </View>
      )}
      {children}
    </Card>
  );
}
