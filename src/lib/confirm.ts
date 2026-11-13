import { Alert, Platform } from "react-native";

/**
 * Asks the user to confirm a destructive action. Alert.alert does nothing on
 * web, so the browser's own confirm dialog is used there.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = "Delete",
): Promise<boolean> {
  if (Platform.OS === "web")
    return Promise.resolve(
      typeof globalThis.confirm === "function"
        ? globalThis.confirm(`${title}\n\n${message}`)
        : false,
    );
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
