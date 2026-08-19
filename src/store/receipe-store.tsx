import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type Ingredient = {
  id: string;
  name: string;
  amount: string;
};

export type Receipe = {
  id: string;
  user_id?: string;
  title: string;
  image_url?: string;
  servings: number;
  time: number;
  ingredients: Ingredient[];
  steps: string;
  notes?: string;
  is_favorite?: boolean;
};

type ReceipeState = {
  receipes: Receipe[];
  loading: boolean;
  fetchReceipes: () => Promise<void>;
  addReceipe: (receipe: Omit<Receipe, "id">) => Promise<void>;
  updateReceipe: (id: string, updatedFields: Partial<Receipe>) => Promise<void>;
  removeReceipe: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
};

export const useReceipeStore = create<ReceipeState>((set, get) => ({
  receipes: [],
  loading: false,

  fetchReceipes: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from("recipes").select("*");
    if (!error && data) {
      set({ receipes: data as Receipe[] });
    }
    set({ loading: false });
  },

  addReceipe: async (receipe) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const { data, error } = await supabase
      .from("recipes")
      .insert({ ...receipe, user_id: userId })
      .select()
      .single();
    if (!error && data) {
      set((state) => ({ receipes: [...state.receipes, data as Receipe] }));
    }
  },

  updateReceipe: async (id, updatedFields) => {
    const { data, error } = await supabase
      .from("recipes")
      .update(updatedFields)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      set((state) => ({
        receipes: state.receipes.map((item) =>
          item.id === id ? (data as Receipe) : item,
        ),
      }));
    }
  },

  removeReceipe: async (id) => {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (!error) {
      set((state) => ({ receipes: state.receipes.filter((item) => item.id !== id) }));
    }
  },
  toggleFavorite: async (id) => {
    const receipe = get().receipes.find((item) => item.id === id);
    if (!receipe) return;

    const newValue = !receipe.is_favorite;
    set((state) => ({
      receipes: state.receipes.map((item) =>
        item.id === id ? { ...item, is_favorite: newValue } : item,
      ),
    }));

    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: newValue })
      .eq("id", id);

    if (error) {
      set((state) => ({
        receipes: state.receipes.map((item) =>
          item.id === id ? { ...item, is_favorite: !newValue } : item,
        ),
      }));
    }
  },
}));
