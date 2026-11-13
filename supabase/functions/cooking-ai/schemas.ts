// JSON Schemas sent to OpenRouter as `response_format: { type: "json_schema" }`.
// They follow the strict-mode subset supported by most providers: every property
// is required, no extra properties, nullable values via type unions / anyOf.
// Ranges (servings, time, day) are still enforced by validateRecipe/validatePlan.

const ingredient = {
  type: "object",
  description:
    "A raw ingredient. For unknown quantities: quantity=0 and unit=\"to taste\".",
  properties: {
    name: { type: "string", description: "Ingredient name, in English." },
    quantity: {
      type: "number",
      description: "Quantity for ALL servings of the recipe. 0 if to taste.",
    },
    unit: {
      type: "string",
      // Metric only: no cups, spoons, ounces or pounds.
      enum: ["g", "kg", "ml", "l", "pcs", "to taste"],
      description: "Metric unit. Use \"to taste\" only when quantity is 0.",
    },
  },
  required: ["name", "quantity", "unit"],
  additionalProperties: false,
} as const;

export const recipeSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Recipe name, in English." },
    servings: {
      type: "integer",
      description: "Number of servings the quantities are for (1-100).",
    },
    time: { type: "integer", description: "Total time in minutes (1-1440)." },
    meal_type: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner", "any"],
    },
    ingredients: { type: "array", items: ingredient },
    steps: {
      type: "string",
      description: "Method steps in English, one per line, separated by \\n.",
    },
    notes: { type: "string", description: "Notes in English, or \"\"." },
    calories: {
      type: ["integer", "null"],
      description:
        "Estimated kcal for ONE serving (not the whole recipe). For imports: only if stated in the material, otherwise null.",
    },
  },
  required: [
    "title",
    "servings",
    "time",
    "meal_type",
    "ingredients",
    "steps",
    "notes",
    "calories",
  ],
  additionalProperties: false,
} as const;

export const planSchema = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer", description: "Plan day, starting at 1." },
          meal: { type: "string", enum: ["breakfast", "lunch", "dinner"] },
          recipe: recipeSchema,
        },
        required: ["day", "meal", "recipe"],
        additionalProperties: false,
      },
    },
  },
  required: ["meals"],
  additionalProperties: false,
} as const;

// Import may legitimately find no recipe, so the model answers with one of the two.
export const importSchema = {
  type: "object",
  properties: {
    recipe: { anyOf: [recipeSchema, { type: "null" }] },
    error: {
      type: ["string", "null"],
      description: "The reason, if the material contains no recipe; otherwise null.",
    },
  },
  required: ["recipe", "error"],
  additionalProperties: false,
} as const;

export const caloriesSchema = {
  type: "object",
  properties: {
    calories: {
      type: "integer",
      description: "Estimated kcal for ONE serving, rounded.",
    },
    note: {
      type: "string",
      description: "One sentence in English about the assumptions made (e.g. amount of oil).",
    },
  },
  required: ["calories", "note"],
  additionalProperties: false,
} as const;

export function responseFormat(
  action: "plan" | "suggest" | "import" | "calories",
) {
  const schema =
    action === "plan"
      ? planSchema
      : action === "import"
        ? importSchema
        : action === "calories"
          ? caloriesSchema
          : recipeSchema;
  return {
    type: "json_schema",
    json_schema: { name: `cookbuddy_${action}`, strict: true, schema },
  };
}
