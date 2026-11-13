# CookBuddy

A personal recipe registry and shared meal planner built with Expo, React Native, TypeScript, Zustand and Supabase. CookBuddy helps two people organize recipes, plan breakfast/lunch/dinner, scale portions and maintain a shared shopping list.

AI recommendations use the free OpenRouter route through an authenticated Supabase Edge Function. Recipes, portion calculations, shopping and planning from saved recipes remain available without AI. AI recipes are validated before use, and imported recipes can be edited before saving.

**Start with [START_HERE_RO.md](START_HERE_RO.md)** for the database migration, free AI setup, deployment instructions, shared kitchen flow, verification commands and current limitations.

## Features

- Searchable recipe registry, meal categories, photos, favorites, editing and notes.
- 1–7 day meal planning, individual meal replacement and batch cooking totals.
- Numeric portion scaling, compatible unit conversion, aggregated shopping and pantry subtraction.
- Shared kitchen for two authenticated accounts, Row Level Security and version conflict detection.
- Recipe ratings/comments used as context for later suggestions.
- AI suggestions from pantry ingredients; editable text/photo import.
- Server-side API credentials, free-model-only configuration, authenticated quotas and explicit failures.

## Run locally

```bash
npm ci
# Copy .env.example to .env and configure public Supabase values.
# Apply the SQL migration and deploy cooking-ai: see START_HERE_RO.md.
npm run web
```

## Validate

```bash
npm run typecheck
npm test
npm run test:db
npm run build:web
npx playwright install chromium
npm run test:ui
```

See the Romanian setup guide for Deno server tests, optional Realtime and the distinction between local/mock verification and live deployment.

## Main modules

- `src/domain/cooking.ts`: shared types, quantity handling, shopping aggregation and AI validation.
- `src/store/kitchen-store.ts`: shared state persistence with revision conflict detection.
- `src/store/receipe-store.tsx`: recipe CRUD; existing route/file spelling retained for compatibility.
- `src/lib/cooking-ai.ts`: AI client; credentials never enter the client bundle.
- `supabase/functions/cooking-ai`: authenticated free OpenRouter integration and server tests.
- `supabase/migrations`: household schema, access policies and atomic AI quotas.
- `tests`: domain, database and browser interaction tests.

The original Expo SDK 54 foundation is retained. No live Supabase migration, AI request or native build is implied by the source package.
