// JSON Schemas sent to OpenRouter as `response_format: { type: "json_schema" }`.
// They follow the strict-mode subset supported by most providers: every property
// is required, no extra properties, nullable values via type unions / anyOf.
// Ranges (servings, time, day) are still enforced by validateRecipe/validatePlan.

const ingredient = {
  type: "object",
  description:
    "Un ingredient crud. Pentru cantități necunoscute: quantity=0 și unit=\"după gust\".",
  properties: {
    name: { type: "string", description: "Denumirea ingredientului, în română." },
    quantity: {
      type: "number",
      description: "Cantitatea pentru TOATE porțiile rețetei. 0 dacă e după gust.",
    },
    unit: {
      type: "string",
      description: "g, kg, ml, l, buc, lingură, linguriță sau \"după gust\".",
    },
  },
  required: ["name", "quantity", "unit"],
  additionalProperties: false,
} as const;

export const recipeSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Numele rețetei, în română." },
    servings: {
      type: "integer",
      description: "Numărul de porții pentru care sunt cantitățile (1-100).",
    },
    time: { type: "integer", description: "Timpul total în minute (1-1440)." },
    meal_type: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner", "any"],
    },
    ingredients: { type: "array", items: ingredient },
    steps: {
      type: "string",
      description: "Pașii de preparare, câte unul pe rând, separați prin \\n.",
    },
    notes: { type: "string", description: "Observații sau \"\"." },
  },
  required: [
    "title",
    "servings",
    "time",
    "meal_type",
    "ingredients",
    "steps",
    "notes",
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
          day: { type: "integer", description: "Ziua planului, de la 1." },
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
      description: "Motivul, dacă materialul nu conține o rețetă; altfel null.",
    },
  },
  required: ["recipe", "error"],
  additionalProperties: false,
} as const;

export function responseFormat(action: "plan" | "suggest" | "import") {
  const schema =
    action === "plan"
      ? planSchema
      : action === "import"
        ? importSchema
        : recipeSchema;
  return {
    type: "json_schema",
    json_schema: { name: `cookbuddy_${action}`, strict: true, schema },
  };
}
