import type { BunnyMood } from "@/components/Bunny";

export type HelpTopic = {
  key: string;
  title: string;
  /** Short, friendly explanation; shown on a tour slide and in the tab's info bubble. */
  body: string;
  /** Tips shown as a small list under the text. */
  tips: string[];
  mood: BunnyMood;
};

/** The onboarding tour, in order. Tab info bubbles reuse the matching topic. */
export const TOUR: HelpTopic[] = [
  {
    key: "welcome",
    title: "Hi, I'm your CookBuddy!",
    body: "I help you decide what to cook, work out how much to buy, and keep everything in sync with the person you cook with. Let me show you around. It takes a minute.",
    tips: [],
    mood: "hello",
  },
  {
    key: "recipes",
    title: "Your recipe collection",
    body: "Everything you like to cook lives here. Add a recipe yourself, or let the AI turn a pasted recipe, a photo, or even just a dish name into one you can edit.",
    tips: [
      "Tap ♡ to keep favorites close",
      "Set the meal type so planning knows when to use it",
      "Calories can be calculated from the ingredients",
    ],
    mood: "idle",
  },
  {
    key: "planner",
    title: "Plan the week",
    body: "Choose how many people and days, and get breakfast, lunch and dinner sorted. Build the plan from your own recipes for free, or ask the AI for fresh ideas.",
    tips: [
      "Tap + / − to change servings for one meal",
      "Swap a meal you don't fancy",
      "See roughly how many calories each day has",
    ],
    mood: "munch",
  },
  {
    key: "shopping",
    title: "The shopping list writes itself",
    body: "Everything in your plan is added up into one list, grouped by supermarket aisle. If three recipes need pepper, you'll see pepper once.",
    tips: [
      "Tick items as you shop; your partner sees the ticks too",
      "“Move bought to pantry” puts your shopping away for you",
      "Share the list on WhatsApp in one tap",
    ],
    mood: "success",
  },
  {
    key: "pantry",
    title: "What's already at home",
    body: "Note what you have, and it's taken off the shopping list automatically. Short on ideas? Ask for a recipe that uses what you've got.",
    tips: [
      "Use the same names as in your recipes",
      "Update amounts after you cook",
    ],
    mood: "idle",
  },
  {
    key: "kitchen",
    title: "Cook together",
    body: "You and your partner can share one kitchen: same recipes, same plan, same list. Send them your kitchen code from Profile and they join from their own account.",
    tips: [
      "Up to two people per kitchen",
      "Changes show up for both of you",
      "Only share the code with the person you cook with",
    ],
    mood: "hello",
  },
  {
    key: "ai",
    title: "A little AI magic ✨",
    body: "The ✨ buttons ask a free AI for plans, ideas and imports. Each account gets 20 AI requests a day. I'll tell you how many are left, and everything else in the app works without AI.",
    tips: [
      "Always check allergies yourself; the AI can make mistakes",
      "Calories are estimates, not label values",
    ],
    mood: "munch",
  },
  {
    key: "cook",
    title: "Let's cook!",
    body: "Open a recipe and tap “Start cooking”. You'll get one big step at a time, timers for anything that needs one, and the screen stays on while your hands are busy.",
    tips: ["Share any recipe from its card", "Leave feedback so future ideas fit you better"],
    mood: "success",
  },
];

/** Which tour topic explains each tab, for the ⓘ bubble in its header. */
export const TAB_HELP: Record<string, string> = {
  index: "recipes",
  planner: "planner",
  shopping: "shopping",
  pantry: "pantry",
  favorites: "recipes",
  profile: "kitchen",
};

export function helpTopic(key: string): HelpTopic {
  return TOUR.find((t) => t.key === key) ?? TOUR[0];
}
