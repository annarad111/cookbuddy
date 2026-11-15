import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useOverlay } from "@/store/overlay-store";
import Bunny from "./Bunny";

/** Renders the app's pop-up dialog and toast. Mounted once in the root layout. */
export default function Overlay() {
  const dialog = useOverlay((s) => s.dialog);
  const toast = useOverlay((s) => s.toast);
  const close = useOverlay((s) => s.close);
  return (
    <>
      <Modal
        visible={!!dialog}
        transparent
        animationType="fade"
        onRequestClose={() => close(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => close(null)}
          accessibilityLabel="Close"
        >
          {dialog && (
            // Inner Pressable stops taps on the card from closing it.
            <Pressable style={styles.card} onPress={() => {}} accessibilityRole="alert">
              <Bunny mood={dialog.mood} size={130} />
              <Text style={styles.title}>{dialog.title}</Text>
              <Text style={styles.message}>{dialog.message}</Text>
              <View style={styles.buttons}>
                {dialog.buttons.map((b) => (
                  <Pressable
                    key={b.value}
                    accessibilityRole="button"
                    onPress={() => close(b.value)}
                    style={[
                      styles.button,
                      b.primary && styles.primary,
                      b.danger && styles.danger,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        (b.primary || b.danger) && { color: "#fff" },
                      ]}
                    >
                      {b.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
      {toast && (
        <View pointerEvents="none" style={styles.toastWrap}>
          <View style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Bunny mood={toast.mood} size={44} />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(60, 38, 28, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fffaf6",
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
    gap: 8,
    shadowColor: "#563b30",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontFamily: "Baloo2_700Bold",
    fontSize: 22,
    color: "#563b30",
    textAlign: "center",
  },
  message: { color: "#786359", fontSize: 15, lineHeight: 22, textAlign: "center" },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, justifyContent: "center" },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: "#faeadd",
    minWidth: 110,
    alignItems: "center",
  },
  primary: { backgroundColor: "#b56443" },
  danger: { backgroundColor: "#c2553f" },
  buttonText: { color: "#6b4133", fontWeight: "700", fontSize: 15 },
  toastWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 90,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#563b30",
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 18,
    maxWidth: 520,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600", flexShrink: 1 },
});
