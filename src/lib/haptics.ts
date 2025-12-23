export const hapticTap = async (ms = 20) => {
  try {
    // ---- Capacitor (Android / iOS) ----
    const anyWindow = window as any;

    if (anyWindow?.Capacitor?.isNativePlatform) {
      const mod = await import("@capacitor/haptics");
      await mod.Haptics.impact({ style: mod.ImpactStyle.Light });
      return;
    }

    // ---- Web / PWA ----
    if ("vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    // fail silently (never crash UI)
  }
};
