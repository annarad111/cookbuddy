/**
 * Finds a cooking time in a step ("Bake for 20 minutes", "simmer 1 hour",
 * "cook 8-10 min") and returns it in seconds. Ranges use the upper value.
 */
export function stepTimerSeconds(step: string): number | null {
  const m = step
    .toLowerCase()
    .match(
      /(\d+(?:[.,]\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/,
    );
  if (!m) return null;
  const value = Number((m[2] ?? m[1]).replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = m[3];
  const seconds = unit.startsWith("h")
    ? value * 3600
    : unit.startsWith("s")
      ? value
      : value * 60;
  // Ignore implausible matches such as "180 degrees" mis-read or 2-day ferments.
  return seconds >= 10 && seconds <= 6 * 3600 ? Math.round(seconds) : null;
}

/** 125 -> "2:05", 3725 -> "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
