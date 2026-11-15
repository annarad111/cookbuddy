import { create } from "zustand";
import type { BunnyMood } from "@/components/Bunny";

export type DialogButton = { label: string; value: string; primary?: boolean; danger?: boolean };
type Dialog = {
  title: string;
  message: string;
  mood: BunnyMood;
  buttons: DialogButton[];
  resolve: (value: string | null) => void;
};
type Toast = { id: number; message: string; mood: BunnyMood };

type OverlayState = {
  dialog: Dialog | null;
  toast: Toast | null;
  close: (value: string | null) => void;
};

export const useOverlay = create<OverlayState>((set, get) => ({
  dialog: null,
  toast: null,
  close: (value) => {
    const d = get().dialog;
    set({ dialog: null });
    d?.resolve(value);
  },
}));

/** Opens the app's own pop-up and resolves with the pressed button's value (null if dismissed). */
export function showDialog(options: {
  title: string;
  message: string;
  mood?: BunnyMood;
  buttons: DialogButton[];
}): Promise<string | null> {
  // A dialog that is still open is answered "dismissed" before the new one shows.
  useOverlay.getState().dialog?.resolve(null);
  return new Promise((resolve) =>
    useOverlay.setState({
      dialog: { mood: "idle", ...options, resolve },
    }),
  );
}

let toastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** A short message at the bottom of the screen that hides itself. */
export function notify(message: string, mood: BunnyMood = "success") {
  if (!message) return;
  const id = ++toastId;
  useOverlay.setState({ toast: { id, message, mood } });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (useOverlay.getState().toast?.id === id) useOverlay.setState({ toast: null });
  }, 3500);
}
