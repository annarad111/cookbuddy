import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useKitchenStore } from "./kitchen-store";
import type { Ingredient, Recipe } from "@/domain/cooking";
export type { Ingredient };
export type Receipe = Recipe;
type ReceipeState = {
  receipes: Receipe[];
  loading: boolean;
  error: string;
  fetchReceipes: () => Promise<void>;
  addReceipe: (r: Omit<Receipe, "id">) => Promise<Receipe>;
  updateReceipe: (id: string, fields: Partial<Receipe>) => Promise<void>;
  removeReceipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  reset: () => void;
};
let fetchSequence = 0;
// The database only grants UPDATE on these columns. Sending anything else
// (e.g. created_at loaded from an older table) makes Supabase reject the whole save.
const EDITABLE = [
  "title",
  "image_url",
  "servings",
  "time",
  "ingredients",
  "steps",
  "notes",
  "is_favorite",
  "meal_type",
] as const;
function editable(fields: Partial<Recipe>): Partial<Recipe> {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE)
    if (fields[key] !== undefined) out[key] = fields[key];
  return out as Partial<Recipe>;
}
export const useReceipeStore = create<ReceipeState>((set, get) => ({
  receipes: [],
  loading: false,
  error: "",
  reset: () => {
    fetchSequence++;
    set({ receipes: [], loading: false, error: "" });
  },
  fetchReceipes: async () => {
    const ticket = ++fetchSequence;
    set({ loading: true, error: "" });
    try {
      const house = useKitchenStore.getState().household;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        get().reset();
        return;
      }
      // Show private recipes plus the selected kitchen; RLS enforces access too.
      let query = supabase.from("recipes").select("*");
      query = house
        ? query.or(
            `household_id.eq.${house.id},and(household_id.is.null,user_id.eq.${user.id})`,
          )
        : query.eq("user_id", user.id).is("household_id", null);
      const { data, error } = await query.order("title");
      if (ticket !== fetchSequence) return;
      set({
        receipes: error ? [] : (data as Recipe[]),
        loading: false,
        error: error?.message || "",
      });
    } catch (e) {
      if (ticket !== fetchSequence) return;
      set({
        loading: false,
        error:
          e instanceof Error ? e.message : "Rețetele nu au putut fi încărcate.",
      });
    }
  },
  addReceipe: async (recipe) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Autentifică-te pentru a salva.");
    const { data, error } = await supabase
      .from("recipes")
      .insert({
        ...editable(recipe),
        user_id: user.id,
        household_id: useKitchenStore.getState().household?.id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    set((s) => ({ receipes: [...s.receipes, data as Recipe] }));
    return data as Recipe;
  },
  updateReceipe: async (id, fields) => {
    const { data, error } = await supabase
      .from("recipes")
      .update(editable(fields))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    set((s) => ({
      receipes: s.receipes.map((r) => (r.id === id ? (data as Recipe) : r)),
    }));
  },
  removeReceipe: async (id) => {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    set((s) => ({ receipes: s.receipes.filter((r) => r.id !== id) }));
  },
  toggleFavorite: async (id) => {
    const r = get().receipes.find((r) => r.id === id);
    if (!r) return;
    try {
      await get().updateReceipe(id, { is_favorite: !r.is_favorite });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Nu am putut salva favorita.",
      });
    }
  },
}));
