import AsyncStorage from "@react-native-async-storage/async-storage";

// "Tour seen" is remembered per account on this device (localStorage on web).
const key = (userId: string) => `cookbuddy:tour-seen:${userId}`;

export async function hasSeenTour(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key(userId))) === "1";
  } catch {
    return true; // storage unavailable: don't block the app with the tour
  }
}

export async function markTourSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key(userId), "1");
  } catch {
    /* storage unavailable: the tour may show again next time */
  }
}
