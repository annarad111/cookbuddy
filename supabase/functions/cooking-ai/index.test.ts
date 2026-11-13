import { handler } from "./index.ts";
function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}
Deno.test(
  "AI handler: authentication, quota, free-only routing, validation and upstream failures",
  async () => {
    const original = globalThis.fetch;
    const env = {
      SUPABASE_URL: "https://mock.supabase.co",
      SUPABASE_ANON_KEY: "public",
      SUPABASE_SERVICE_ROLE_KEY: "server",
      OPENROUTER_API_KEY: "test-key",
      OPENROUTER_MODEL: "openrouter/free",
    };
    for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
    let authenticated = true;
    let allowed = true;
    let upstreamStatus = 200;
    let malformed = false;
    let requestCount = 0;
    let schemaUnsupported = false;
    let noRecipe = false;
    let badCalories = false;
    const formats: string[] = [];
    const recipe = {
      title: "Orez cu legume",
      servings: 2,
      time: 20,
      meal_type: "dinner",
      ingredients: [{ name: "Orez", quantity: 150, unit: "g" }],
      steps: "Fierbe orezul.\nAdaugă legumele.",
    };
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input instanceof Request ? input.url : input);
      const json = (value: unknown, status = 200) =>
        new Response(JSON.stringify(value), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (url.includes("/auth/v1/user"))
        return authenticated
          ? json({
              id: "11111111-1111-4111-8111-111111111111",
              email: "test@example.com",
              aud: "authenticated",
            })
          : json({ message: "Invalid token" }, 401);
      if (url.includes("/rpc/cookbuddy_consume_ai")) return json(allowed);
      if (url.includes("/cookbuddy_profiles")) return json(null);
      if (url.includes("/recipes")) return json([]);
      if (url.includes("openrouter.ai")) {
        requestCount++;
        const body = JSON.parse(String(init?.body));
        assert(
          body.model === "openrouter/free",
          "Must use only the free router",
        );
        const format = body.response_format;
        formats.push(
          format.type === "json_schema" ? format.json_schema.name : format.type,
        );
        if (format.type === "json_schema") {
          assert(format.json_schema.strict === true, "Strict schema");
          assert(
            body.provider?.require_parameters === true,
            "Route only to endpoints supporting the schema",
          );
          if (schemaUnsupported)
            return json({ error: "No endpoints found" }, 404);
        }
        if (upstreamStatus !== 200)
          return json({ error: "upstream" }, upstreamStatus);
        const importing = format.json_schema?.name === "cookbuddy_import";
        const answer = format.json_schema?.name === "cookbuddy_calories"
          ? { calories: badCalories ? 99999 : 412.4, note: "Ulei estimat." }
          : importing
          ? noRecipe
            ? { recipe: null, error: "Nu e o rețetă." }
            : { recipe, error: null }
          : recipe;
        return json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: malformed ? "not json" : JSON.stringify(answer),
              },
            },
          ],
        });
      }
      throw new Error("Unexpected URL: " + url);
    }) as typeof fetch;
    const request = (body: unknown) =>
      new Request("http://localhost/cooking-ai", {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    const body = {
      action: "suggest",
      meal: "dinner",
      preferences: { people: 2, days: 1, maxMinutes: 30, excluded: "" },
    };
    try {
      let r = await handler(
        new Request("http://localhost", { method: "OPTIONS" }),
      );
      assert(r.status === 200, "CORS preflight");
      authenticated = false;
      r = await handler(request(body));
      assert(r.status === 401, "Reject unauthenticated users");
      authenticated = true;
      allowed = false;
      r = await handler(request(body));
      assert(r.status === 429, "Enforce server quota");
      allowed = true;
      Deno.env.set("OPENROUTER_MODEL", "paid/model");
      r = await handler(request(body));
      assert(
        r.status === 503 && requestCount === 0,
        "Reject paid models before inference",
      );
      Deno.env.set("OPENROUTER_MODEL", "openrouter/free");
      r = await handler(request(body));
      assert(r.status === 200, "Valid free recommendation");
      const output = await r.json();
      assert(output.title === recipe.title, "Return recipe");
      assert(formats.at(-1) === "cookbuddy_suggest", "Send recipe schema");
      schemaUnsupported = true;
      r = await handler(request(body));
      assert(
        r.status === 200 && formats.slice(-2).join() === "cookbuddy_suggest,json_object",
        "Fall back to plain JSON when no endpoint supports the schema",
      );
      schemaUnsupported = false;
      r = await handler(request({ action: "import", text: "Orez cu legume" }));
      const imported = await r.json();
      assert(
        r.status === 200 && imported.title === recipe.title,
        "Unwrap structured import to the bare recipe",
      );
      noRecipe = true;
      r = await handler(request({ action: "import", text: "Salut" }));
      assert(r.status === 422, "Explain when the material has no recipe");
      noRecipe = false;
      const calls = requestCount;
      r = await handler(request({ action: "calories", recipe: { servings: 2 } }));
      assert(
        r.status === 400 && requestCount === calls,
        "Reject calorie requests without ingredients before calling the model",
      );
      const caloriesBody = {
        action: "calories",
        recipe: {
          title: "Orez",
          servings: 2,
          ingredients: [{ name: "Orez", quantity: 150, unit: "g", amount: "150 g" }],
        },
      };
      r = await handler(request(caloriesBody));
      const kcal = await r.json();
      assert(
        r.status === 200 && kcal.calories === 412 && kcal.note === "Ulei estimat.",
        "Return a rounded calorie estimate per portion",
      );
      badCalories = true;
      r = await handler(request(caloriesBody));
      assert(r.status === 502, "Reject absurd calorie estimates");
      badCalories = false;
      r = await handler(
        request({
          ...body,
          preferences: { ...body.preferences, excluded: "orez" },
        }),
      );
      assert(r.status === 422, "Reject excluded ingredients");
      upstreamStatus = 429;
      r = await handler(request(body));
      assert(r.status === 429, "Explain provider free quota");
      upstreamStatus = 200;
      malformed = true;
      r = await handler(request(body));
      assert(r.status === 502, "Reject malformed AI JSON");
      malformed = false;
      r = await handler(
        request({
          action: "import",
          text: "Recipe",
          image: "data:image/svg+xml;base64,evil",
        }),
      );
      assert(r.status === 400, "Reject unsupported image input");
      Deno.env.delete("OPENROUTER_API_KEY");
      r = await handler(request(body));
      assert(r.status === 503, "Explain missing key");
    } finally {
      globalThis.fetch = original;
      for (const key of Object.keys(env)) Deno.env.delete(key);
    }
  },
);
