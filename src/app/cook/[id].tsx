import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useReceipeStore } from "@/store/receipe-store";
import { scaledIngredient } from "@/domain/cooking";
import { formatClock, stepTimerSeconds } from "@/domain/timers";
import { showDialog } from "@/store/overlay-store";
import Bunny from "@/components/Bunny";
import { Action, Copy, ui } from "@/components/KitchenUI";

type Timer = { label: string; total: number; endsAt: number | null; left: number };

/** Full-screen, one-step-at-a-time cooking view with timers; the screen stays on. */
export default function CookMode() {
  const { id, servings: servingsParam } = useLocalSearchParams<{
    id: string;
    servings?: string;
  }>();
  const recipe = useReceipeStore((s) => s.receipes.find((r) => r.id === id));
  const servings = Math.max(1, Number(servingsParam) || recipe?.servings || 1);
  const steps = (recipe?.steps || "")
    .split("\n")
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  // Page 0 is the ingredient checklist, then one page per step.
  const [page, setPage] = useState(0);
  const [have, setHave] = useState<string[]>([]);
  const [timer, setTimer] = useState<Timer | null>(null);
  const timerRef = useRef<Timer | null>(null);
  timerRef.current = timer;

  useEffect(() => {
    const tag = "cook-mode";
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      void Promise.resolve(deactivateKeepAwake(tag)).catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!timer?.endsAt) return;
    const interval = setInterval(() => {
      const t = timerRef.current;
      if (!t?.endsAt) return;
      const left = Math.max(0, Math.round((t.endsAt - Date.now()) / 1000));
      if (left === 0) {
        setTimer({ ...t, endsAt: null, left: 0 });
        ring(t.label);
      } else if (left !== t.left) setTimer({ ...t, left });
    }, 500);
    return () => clearInterval(interval);
  }, [timer?.endsAt]);

  if (!recipe)
    return (
      <View style={styles.screen}>
        <Copy>Recipe not found, or still loading.</Copy>
        <Action label="Back" secondary onPress={() => router.back()} />
      </View>
    );

  const last = steps.length;
  const step = page > 0 ? steps[page - 1] : "";
  const stepSeconds = page > 0 ? stepTimerSeconds(step) : null;

  function start(seconds: number, label: string) {
    setTimer({ label, total: seconds, left: seconds, endsAt: Date.now() + seconds * 1000 });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close cooking mode"
          onPress={() => router.back()}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.recipeTitle} numberOfLines={1}>
          {recipe.title}
        </Text>
      </View>
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${(page / Math.max(1, last)) * 100}%` }]} />
      </View>

      <View style={styles.body}>
        {page === 0 ? (
          <>
            <Text style={styles.kicker}>Get ready · {servings} servings</Text>
            <Text style={styles.hint}>Tap what you have ready.</Text>
            <View style={{ gap: 8, width: "100%" }}>
              {recipe.ingredients.map((i) => {
                const ok = have.includes(i.id);
                return (
                  <Pressable
                    key={i.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: ok }}
                    onPress={() =>
                      setHave((h) => (ok ? h.filter((x) => x !== i.id) : [...h, i.id]))
                    }
                    style={[styles.ingredient, ok && styles.ingredientDone]}
                  >
                    <Text style={[styles.ingredientText, ok && styles.done]}>
                      {ok ? "☑" : "☐"} {i.name} — {scaledIngredient(i, servings, recipe.servings)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.kicker}>
              Step {page} of {last}
            </Text>
            <Text style={styles.step}>{step}</Text>
            {stepSeconds != null && timer?.label !== step && (
              <Action
                label={`Start ${formatClock(stepSeconds)} timer ⏱`}
                onPress={() => start(stepSeconds, step)}
              />
            )}
          </>
        )}
        {page === last && last > 0 && (
          <View style={{ alignItems: "center" }}>
            <Bunny mood="success" size={110} />
            <Text style={styles.hint}>Last step. Enjoy your meal!</Text>
          </View>
        )}
      </View>

      {timer && (
        <View style={styles.timer}>
          <Text style={styles.timerClock}>{formatClock(timer.left)}</Text>
          <View style={ui.row}>
            {timer.endsAt ? (
              <Action
                secondary
                label="Pause"
                onPress={() => setTimer({ ...timer, endsAt: null })}
              />
            ) : timer.left > 0 ? (
              <Action
                secondary
                label="Resume"
                onPress={() =>
                  setTimer({ ...timer, endsAt: Date.now() + timer.left * 1000 })
                }
              />
            ) : null}
            <Action secondary label="Stop timer" onPress={() => setTimer(null)} />
          </View>
        </View>
      )}

      <View style={styles.nav}>
        <View style={{ flex: 1 }}>
          <Action
            secondary
            label="← Back"
            disabled={page === 0}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
          />
        </View>
        <View style={{ flex: 1 }}>
          {page < last ? (
            <Action
              label={page === 0 ? "Start cooking →" : "Next →"}
              onPress={() => setPage((p) => Math.min(last, p + 1))}
            />
          ) : (
            <Action label="Done ✓" onPress={() => router.back()} />
          )}
        </View>
      </View>
    </View>
  );
}

function ring(label: string) {
  if (Platform.OS === "web") {
    try {
      (globalThis.navigator as Navigator | undefined)?.vibrate?.([300, 150, 300]);
    } catch {
      /* not supported */
    }
  } else Vibration.vibrate([0, 400, 200, 400]);
  void showDialog({
    title: "Time's up! ⏱",
    message: label,
    mood: "success",
    buttons: [{ label: "Got it", value: "ok", primary: true }],
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff6ef",
    padding: 20,
    gap: 16,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#faeadd",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 18, color: "#6b4133", fontWeight: "700" },
  recipeTitle: { flex: 1, fontFamily: "Baloo2_700Bold", fontSize: 22, color: "#563b30" },
  progress: { height: 8, borderRadius: 4, backgroundColor: "#f1dfd2", overflow: "hidden" },
  progressFill: { height: 8, backgroundColor: "#b56443" },
  body: { flex: 1, gap: 18, justifyContent: "center", alignItems: "center" },
  kicker: { color: "#b56443", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
  hint: { color: "#86756b", fontSize: 15 },
  step: {
    fontSize: 26,
    lineHeight: 36,
    color: "#3b3029",
    textAlign: "center",
    fontWeight: "600",
  },
  ingredient: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#efddd0",
  },
  ingredientDone: { backgroundColor: "#f6efe8" },
  ingredientText: { fontSize: 17, color: "#3b3029" },
  done: { textDecorationLine: "line-through", opacity: 0.55 },
  timer: {
    backgroundColor: "#563b30",
    borderRadius: 22,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  timerClock: { color: "#fff", fontSize: 44, fontWeight: "700", fontVariant: ["tabular-nums"] },
  nav: { flexDirection: "row", gap: 12 },
});
