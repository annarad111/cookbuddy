import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Bunny from "@/components/Bunny";
import { TOUR } from "@/constants/help";
import { markTourSeen } from "@/lib/onboarding";
import { useAuthStore } from "@/store/auth-store";

const native = Platform.OS !== "web";

/** Swipeable welcome tour: one feature per slide, with the bunny. */
export default function Onboarding() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [index, setIndex] = useState(0);
  const slide = TOUR[index];
  const last = index === TOUR.length - 1;
  const fade = useRef(new Animated.Value(1)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;

  // The bunny gently floats up and down the whole time.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);

  function go(to: number) {
    if (to < 0 || to >= TOUR.length || to === index) return;
    const dir = to > index ? 1 : -1;
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: native }),
      Animated.timing(shift, { toValue: -40 * dir, duration: 140, useNativeDriver: native }),
    ]).start(() => {
      setIndex(to);
      shift.setValue(40 * dir);
      pop.setValue(0.6);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: native }),
        Animated.timing(shift, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }),
      ]).start();
    });
  }

  // Swipe left/right to move between slides.
  const indexRef = useRef(index);
  indexRef.current = index;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) goRef.current(indexRef.current + 1);
        else if (g.dx > 50) goRef.current(indexRef.current - 1);
      },
    }),
  ).current;
  const goRef = useRef(go);
  goRef.current = go;

  async function finish() {
    if (userId) await markTourSeen(userId);
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const bob = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.count}>
          {index + 1} / {TOUR.length}
        </Text>
        {!last && (
          <Pressable accessibilityRole="button" onPress={finish} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body} {...swipe.panHandlers}>
        <Animated.View
          style={{ alignItems: "center", gap: 16, opacity: fade, transform: [{ translateX: shift }] }}
        >
          <View style={styles.halo}>
            <Animated.View style={{ transform: [{ translateY: bob }, { scale: pop }] }}>
              <Bunny mood={slide.mood} size={190} />
            </Animated.View>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {slide.title}
          </Text>
          <Text style={styles.text}>{slide.body}</Text>
          {slide.tips.length > 0 && (
            <View style={styles.tips}>
              {slide.tips.map((t) => (
                <View key={t} style={styles.tipRow}>
                  <Text style={styles.tipDot}>🥕</Text>
                  <Text style={styles.tip}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </View>

      <View style={styles.dots}>
        {TOUR.map((t, i) => (
          <Pressable
            key={t.key}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${i + 1}`}
            onPress={() => go(i)}
            hitSlop={8}
          >
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </Pressable>
        ))}
      </View>

      <View style={styles.nav}>
        {index > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => go(index - 1)} style={[styles.button, styles.secondary]}>
            <Text style={[styles.buttonText, { color: "#6b4133" }]}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => (last ? finish() : go(index + 1))}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{last ? "Let's start! 🥕" : "Next"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDE2DD",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    minHeight: 44,
  },
  count: { color: "#a0766a", fontWeight: "700" },
  skip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#ffffffaa" },
  skipText: { color: "#6b4133", fontWeight: "700" },
  body: { flex: 1, justifyContent: "center", width: "100%", maxWidth: 560, alignSelf: "center" },
  halo: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#fff6ef",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Baloo2_700Bold",
    fontSize: 28,
    lineHeight: 34,
    color: "#563b30",
    textAlign: "center",
  },
  text: { fontSize: 17, lineHeight: 25, color: "#6f5a51", textAlign: "center" },
  tips: { gap: 8, alignSelf: "stretch", backgroundColor: "#fff6ef", borderRadius: 18, padding: 14 },
  tipRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  tipDot: { fontSize: 14, lineHeight: 22 },
  tip: { flex: 1, fontSize: 15, lineHeight: 22, color: "#563b30" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#e8b8a8" },
  dotActive: { width: 24, backgroundColor: "#b56443" },
  nav: { flexDirection: "row", gap: 12, width: "100%", maxWidth: 560, alignSelf: "center" },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#b56443",
  },
  secondary: { backgroundColor: "#fff6ef" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
