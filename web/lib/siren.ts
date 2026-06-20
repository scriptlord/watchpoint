// The in-app "siren" — a short two-tone alert + vibration when a new alarm
// arrives while the app is open. No Firebase / device_tokens needed; pure
// browser Web Audio + Vibration APIs.
export function playSiren() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const tones = [880, 660, 880, 660, 880];
    tones.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = now + i * 0.26;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      o.start(t);
      o.stop(t + 0.25);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    /* audio not allowed yet — ignore */
  }
  try {
    navigator.vibrate?.([220, 90, 220, 90, 320]);
  } catch {
    /* not supported */
  }
}
