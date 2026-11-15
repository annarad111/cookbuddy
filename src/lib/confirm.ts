import { showDialog } from "@/store/overlay-store";

/** Asks the user to confirm a destructive action in the app's own pop-up. */
export async function confirmAction(
  title: string,
  message: string,
  confirmLabel = "Delete",
): Promise<boolean> {
  const answer = await showDialog({
    title,
    message,
    mood: "idle",
    buttons: [
      { label: "Cancel", value: "cancel" },
      { label: confirmLabel, value: "confirm", danger: true },
    ],
  });
  return answer === "confirm";
}
