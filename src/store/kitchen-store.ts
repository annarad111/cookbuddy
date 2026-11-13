import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { defaultKitchen, KitchenState } from "@/domain/cooking";

type Household = {
  id: string;
  name: string;
  invite_code?: string;
  owner_id: string;
};
type KitchenStore = {
  household: Household | null;
  data: KitchenState;
  revision: number;
  loading: boolean;
  saving: boolean;
  error: string;
  accountId: string | null;
  load: () => Promise<void>;
  commit: (edit: (current: KitchenState) => KitchenState) => Promise<void>;
  join: (code: string) => Promise<void>;
  reset: () => void;
};
let loadSequence = 0;
export const useKitchenStore = create<KitchenStore>((set, get) => ({
  household: null,
  data: defaultKitchen(),
  revision: 0,
  loading: false,
  saving: false,
  error: "",
  accountId: null,
  reset: () => {
    loadSequence++;
    set({
      household: null,
      data: defaultKitchen(),
      revision: 0,
      loading: false,
      saving: false,
      error: "",
      accountId: null,
    });
  },
  load: async () => {
    const ticket = ++loadSequence;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (ticket !== loadSequence) return;
    if (!user) {
      get().reset();
      return;
    }
    if (get().saving) return;
    if (get().accountId !== user.id)
      set({ household: null, data: defaultKitchen(), revision: 0 });
    set({ loading: true, error: "", accountId: user.id });
    try {
      const { data: id, error: setupError } = await supabase.rpc(
        "cookbuddy_current_household",
      );
      if (setupError)
        throw new Error(
          "Could not load the kitchen. Check the Supabase migration. " +
            setupError.message,
        );
      const [house, state] = await Promise.all([
        supabase.from("cookbuddy_households").select("*").eq("id", id).single(),
        supabase
          .from("cookbuddy_state")
          .select("*")
          .eq("household_id", id)
          .single(),
      ]);
      if (house.error) throw house.error;
      if (state.error) throw state.error;
      if (ticket !== loadSequence) return;
      const initial = defaultKitchen();
      set({
        household: house.data,
        revision: state.data.revision,
        data: {
          ...initial,
          ...state.data.payload,
          preferences: {
            ...initial.preferences,
            ...state.data.payload?.preferences,
          },
        },
        loading: false,
      });
    } catch (e) {
      if (ticket !== loadSequence) return;
      set({
        loading: false,
        error:
          e instanceof Error ? e.message : "Connection to Supabase failed.",
      });
      throw e;
    }
  },
  commit: async (edit) => {
    const state = get();
    if (!state.household)
      throw new Error("Load the kitchen from Profile before saving.");
    if (state.saving)
      throw new Error(
        "A change is already being saved. Try again in a moment.",
      );
    const next = edit(state.data);
    loadSequence++; // An older refresh must not overwrite this save.
    set({ saving: true });
    try {
      const { data, error } = await supabase.rpc("cookbuddy_save_state", {
        p_household: state.household.id,
        p_revision: state.revision,
        p_payload: next,
      });
      if (error) {
        if (error.message.includes("CONFLICT")) {
          set({ saving: false });
          await get().load();
          throw new Error(
            "Someone else or another device changed the data. The new version was loaded; please repeat your change.",
          );
        }
        throw new Error(error.message);
      }
      if (get().accountId === state.accountId)
        set({ data: next, revision: data });
    } finally {
      set({ saving: false });
    }
  },
  join: async (code) => {
    if (get().saving) throw new Error("Wait for the save to finish.");
    const { error } = await supabase.rpc("cookbuddy_join_household", {
      p_code: code.trim(),
    });
    if (error) throw new Error("Invalid code or kitchen unavailable.");
    await get().load();
  },
}));
