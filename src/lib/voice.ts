import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { isNative } from "./platform";

// Minimal typing for the browser's Web Speech API (Chrome ships it prefixed).
interface WebRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
}
type WebRecognitionCtor = new () => WebRecognition;
const webCtor = (): WebRecognitionCtor | undefined =>
  (window as unknown as { SpeechRecognition?: WebRecognitionCtor; webkitSpeechRecognition?: WebRecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: WebRecognitionCtor }).webkitSpeechRecognition;

export function voiceSupported(): boolean {
  return isNative || !!webCtor();
}

export class VoiceError extends Error {}

/**
 * Listen once and return what was said. On Android this opens Google's speech dialog
 * (English, India — so "roti", "dal" and "paneer" come through). Resolves null when
 * nothing was heard or the dialog was dismissed.
 */
export async function listen(): Promise<string | null> {
  if (isNative) {
    const { available } = await SpeechRecognition.available();
    if (!available) throw new VoiceError("Speech recognition isn't available on this phone");
    let perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== "granted") perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") throw new VoiceError("Allow the microphone for Pulse to use voice");
    try {
      const r = await SpeechRecognition.start({ language: "en-IN", maxResults: 1, prompt: "What did you eat?", partialResults: false, popup: true });
      return r.matches?.[0]?.trim() || null;
    } catch {
      return null; // dismissed or nothing recognised
    }
  }
  const Ctor = webCtor();
  if (!Ctor) throw new VoiceError("Voice isn't supported in this browser");
  return new Promise((resolve, reject) => {
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let said: string | null = null;
    rec.onresult = (e) => {
      said = e.results[0]?.[0]?.transcript?.trim() || null;
    };
    rec.onerror = (e) => (e.error === "not-allowed" ? reject(new VoiceError("Allow the microphone to use voice")) : undefined);
    rec.onend = () => resolve(said);
    rec.start();
  });
}

/** Add a spoken phrase to what's already typed, as another comma-separated item. */
export function appendSpoken(text: string, spoken: string): string {
  const t = text.trim().replace(/,\s*$/, "");
  return t ? `${t}, ${spoken}` : spoken;
}
