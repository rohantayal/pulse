let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function bell(ac: AudioContext, freq: number, at: number, dur: number, gain: number) {
  // A soft bell: sine fundamental + quiet octave partial with exponential decay.
  for (const [mult, g] of [[1, gain], [2, gain * 0.25], [3, gain * 0.08]] as const) {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(g, at + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }
}

/** Little rising chime for a new personal record. */
export function playPrChime() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  bell(ac, 1046.5, t, 0.5, 0.18); // C6
  bell(ac, 1318.5, t + 0.09, 0.55, 0.16); // E6
  bell(ac, 1568.0, t + 0.18, 0.9, 0.18); // G6
  bell(ac, 2093.0, t + 0.3, 1.1, 0.12); // C7
}

/** Short double beep when the rest timer ends. */
export function playRestDone() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.02;
  bell(ac, 880, t, 0.18, 0.15);
  bell(ac, 880, t + 0.22, 0.25, 0.15);
}

/** Call from a user gesture so iOS lets us play later. */
export function unlockAudio() {
  audio();
}
