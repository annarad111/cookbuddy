import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { execFileSync } from "node:child_process";
const project = resolve(import.meta.dirname, "..");
const dist = resolve(project, ".test-dist");
const userId = "11111111-1111-4111-8111-111111111111";
const houseId = "44444444-4444-4444-8444-444444444444";
const recipe = (meal) => ({
  id: `55555555-5555-4555-8555-55555555555${["breakfast", "lunch", "dinner"].indexOf(meal)}`,
  title: {
    breakfast: "Protein pancakes",
    lunch: "Pasta bolognese",
    dinner: "Chicken shawarma",
  }[meal],
  servings: 2,
  time: 25,
  meal_type: meal,
  ingredients: [
    {
      id: "pui",
      name: "Chicken breast",
      quantity: 500,
      unit: "g",
      amount: "500 g",
    },
  ],
  steps: "Prepare the ingredients.\nCook and serve.",
  calories: 400,
  user_id: userId,
  household_id: houseId,
});
test(
  "web: protected routes, planning, portions, shopping, pantry and editable AI import",
  { timeout: 180000 },
  async () => {
    execFileSync(
      process.execPath,
      [
        "node_modules/expo/bin/cli",
        "export",
        "--platform",
        "web",
        "--output-dir",
        ".test-dist",
        "--clear",
      ],
      {
        cwd: project,
        env: {
          ...process.env,
          // Never let the local .env (real project) leak into the mocked test build.
          EXPO_NO_DOTENV: "1",
          EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          EXPO_PUBLIC_SUPABASE_ANON_KEY: "example-public-key",
        },
        stdio: "inherit",
      },
    );
    const server = createServer(async (req, res) => {
      let pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let path = resolve(dist, "." + pathname);
      if (!path.startsWith(dist + sep) && path !== dist) {
        res.writeHead(403).end();
        return;
      }
      if (pathname === "/") path = resolve(dist, "index.html");
      else if (!existsSync(path) && existsSync(path + ".html")) path += ".html";
      else if (!existsSync(path)) path = resolve(dist, "index.html");
      const mime =
        {
          ".html": "text/html",
          ".js": "application/javascript",
          ".json": "application/json",
          ".png": "image/png",
          ".ttf": "font/ttf",
        }[extname(path)] || "application/octet-stream";
      try {
        res.writeHead(200, { "Content-Type": mime }).end(await readFile(path));
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? {
              executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
              args: process.env.COOKBUDDY_HEADLESS_SHELL
                ? ["--no-sandbox", "--single-process", "--no-zygote"]
                : [],
            }
          : {}),
      });
      let kitchen = {
        preferences: {
          people: 2,
          days: 3,
          maxMinutes: 40,
          preferences: "",
          excluded: "",
          repeatMeals: true,
          source: "saved",
        },
        plan: [],
        pantry: [],
        checked: [],
        feedback: [],
      };
      let revision = 0;
      let recipes = ["breakfast", "lunch", "dinner"].map(recipe);
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("https://example.supabase.co/**", async (route) => {
        const req = route.request();
        const path = new URL(req.url()).pathname;
        const reply = (data, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(data),
          });
        if (path === "/auth/v1/user")
          return reply({
            id: userId,
            email: "ana@example.com",
            aud: "authenticated",
          });
        if (path.endsWith("/rpc/cookbuddy_current_household"))
          return reply(houseId);
        if (path.endsWith("/rpc/cookbuddy_save_state")) {
          const b = req.postDataJSON();
          if (b.p_revision !== revision)
            return reply({ message: "CONFLICT" }, 409);
          kitchen = b.p_payload;
          return reply(++revision);
        }
        if (path.endsWith("/cookbuddy_households"))
          return reply({
            id: houseId,
            name: "Our kitchen",
            owner_id: userId,
            invite_code: houseId,
          });
        if (path.endsWith("/cookbuddy_state"))
          return reply({ household_id: houseId, revision, payload: kitchen });
        if (path.endsWith("/recipes")) {
          if (req.method() === "POST") {
            const r = {
              ...req.postDataJSON(),
              id: "66666666-6666-4666-8666-666666666666",
            };
            recipes.push(r);
            return reply(r, 201);
          }
          return reply(recipes);
        }
        if (path.endsWith("/functions/v1/cooking-ai"))
          return reply({ ...recipe("dinner"), title: "Imported recipe" });
        return reply([]);
      });
      await page.routeWebSocket("wss://example.supabase.co/**", (socket) =>
        socket.close(),
      );
      await page.goto(base + "/planner");
      await page.getByText("Log in 🥕", { exact: true }).waitFor(); // protected route redirects to welcome
      const jwt = [
        "eyJhbGciOiJIUzI1NiJ9",
        Buffer.from(
          JSON.stringify({
            sub: userId,
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ).toString("base64url"),
        "test",
      ].join(".");
      await page.evaluate(
        ({ userId, jwt }) =>
          localStorage.setItem(
            "sb-example-auth-token",
            JSON.stringify({
              access_token: jwt,
              refresh_token: "test-refresh",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: "bearer",
              user: {
                id: userId,
                email: "ana@example.com",
                aud: "authenticated",
              },
            }),
          ),
        { userId, jwt },
      );
      await page.goto(base + "/");
      await page.getByText("Protein pancakes", { exact: true }).waitFor();
      await page.getByRole("tab", { name: /Plan$/ }).click();
      await page.getByText("What are we cooking?", { exact: true }).waitFor();
      await page
        .getByRole("button", {
          name: "Plan from my recipes · no AI",
          exact: true,
        })
        .click();
      await page.getByText("Your plan", { exact: true }).waitFor();
      assert.equal(kitchen.plan.length, 9);
      await page.getByText("Day 1 · ≈ 1200 kcal/person", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "+ 1 serving", exact: true })
        .first()
        .click();
      await page.waitForFunction(() =>
        document.body.innerText.includes("3 servings"),
      );
      assert.equal(kitchen.plan[0].servings, 3);
      if (process.env.SCREENSHOT_DIR)
        await page.screenshot({
          path: resolve(process.env.SCREENSHOT_DIR, "planner-desktop.png"),
        });
      await page.getByText("List", { exact: true }).click();
      await page.getByRole("checkbox").first().waitFor();
      assert.match(
        await page.getByRole("checkbox").first().innerText(),
        /4750 g/,
      );
      await page.getByRole("checkbox").first().click();
      await page.waitForFunction(() => document.body.innerText.includes("☑"));
      assert.equal(kitchen.checked.length, 1);
      await page.getByText("Pantry", { exact: true }).click();
      await page.getByLabel("Ingredient", { exact: true }).fill("Chicken breast");
      await page.getByLabel("Quantity", { exact: true }).fill("500");
      await page
        .getByRole("button", { name: "Add to pantry", exact: true })
        .click();
      await page.waitForFunction(() =>
        document.body.innerText.includes("Remove from pantry"),
      );
      assert.equal(kitchen.pantry.length, 1);
      await page.getByText("List", { exact: true }).click();
      assert.match(
        await page.getByRole("checkbox").first().innerText(),
        /4250 g/,
      );
      await page.getByText("Recipes", { exact: true }).last().click();
      await page
        .getByRole("button", { name: "Import with AI ✨", exact: true })
        .click();
      await page
        .getByLabel("Recipe text", { exact: true })
        .fill("Rice with vegetables, 2 servings, 150 g rice, boil.");
      await page
        .getByRole("button", {
          name: "Prepare recipe with AI ✨",
          exact: true,
        })
        .click();
      await page
        .getByText("Review and edit the recipe", { exact: true })
        .waitFor();
      await page
        .getByLabel("Recipe name", { exact: true })
        .fill("Recipe checked by Ana");
      // Imported: 500 g chicken breast for 2 portions -> 600 kcal / 2.
      await page
        .getByRole("button", { name: "Calculate from ingredients", exact: true })
        .click();
      await page.getByText("≈ 300 kcal/serving (600 kcal total).", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: "Save recipe", exact: true })
        .click();
      await page
        .getByText("Recipe checked by Ana", { exact: true })
        .waitFor();
      assert.equal(recipes.at(-1).calories, 300, "calories saved with the recipe");
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("tab", { name: /Plan$/ }).click();
      if (process.env.SCREENSHOT_DIR)
        await page.screenshot({
          path: resolve(process.env.SCREENSHOT_DIR, "planner-mobile.png"),
        });
      assert.deepEqual(errors, [], "No runtime errors");
    } finally {
      await browser?.close();
      await new Promise((r) => server.close(r));
    }
  },
);
