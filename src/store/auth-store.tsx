import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type AuthState = {
  session: Session | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  initAuth: () => void;
};

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,

  setSession: (session) => set({ session }),
  initAuth: () => {
    if (initialized) return;
    initialized = true;
    // A failed session lookup (offline, bad env) must not leave the app blank forever.
    supabase.auth
      .getSession()
      .then(({ data }) => set({ session: data.session }))
      .catch(() => set({ session: null }))
      .finally(() => set({ loading: false }));
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, loading: false });
    });
  },
}));
