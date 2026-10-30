export interface VoiceInfo {
  hasTamilVoice: boolean;
  voiceName: string;
  langCode: string;
}

export function detectSpeechVoices(): VoiceInfo {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { hasTamilVoice: false, voiceName: "Not supported in this browser", langCode: "en" };
  }

  const voices = window.speechSynthesis.getVoices();
  const tamilVoice = voices.find((v) => v.lang.startsWith("ta") || v.lang.includes("Tamil"));
  if (tamilVoice) {
    return { hasTamilVoice: true, voiceName: tamilVoice.name, langCode: tamilVoice.lang };
  }

  const inEnglishVoice = voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("India"));
  if (inEnglishVoice) {
    return { hasTamilVoice: false, voiceName: inEnglishVoice.name, langCode: inEnglishVoice.lang };
  }

  const defaultVoice = voices[0];
  return {
    hasTamilVoice: false,
    voiceName: defaultVoice ? defaultVoice.name : "System default voice",
    langCode: defaultVoice ? defaultVoice.lang : "en-US",
  };
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  preferredLang: "ta" | "en" = "en",
  onEnd?: () => void
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  if (preferredLang === "ta") {
    const tamilVoice = voices.find((v) => v.lang.startsWith("ta") || v.lang.includes("Tamil"));
    if (tamilVoice) {
      utterance.voice = tamilVoice;
      utterance.lang = "ta-IN";
    } else {
      // Fallback
      utterance.lang = "en-IN";
    }
  } else {
    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    if (englishVoice) {
      utterance.voice = englishVoice;
      utterance.lang = englishVoice.lang;
    }
  }

  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    activeUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.warn("Speech synthesis error", e);
    activeUtterance = null;
    if (onEnd) onEnd();
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}
