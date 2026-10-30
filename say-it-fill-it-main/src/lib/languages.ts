export interface LanguageOption {
  id: string;
  code: string;
  label: string;
  nativeLabel: string;
  samplePhrase: string;
  direction?: "ltr" | "rtl";
  speechSupported: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    id: "tanglish",
    code: "ta-IN",
    label: "Tanglish (Tamil + English)",
    nativeLabel: "Tanglish",
    samplePhrase: "En peru Ravi Kumar, enakku 28 vayasu, naan Chennai la software engineer ah work panren.",
    speechSupported: true,
  },
  {
    id: "tamil",
    code: "ta-IN",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    samplePhrase: "என் பெயர் ரவி குமார், எனக்கு 28 வயது, நான் சென்னையில் இருக்கிறேன்.",
    speechSupported: true,
  },
  {
    id: "english",
    code: "en-IN",
    label: "English (Indian / Global)",
    nativeLabel: "English",
    samplePhrase: "My name is Ravi Kumar, I am 28 years old, my phone is 98765 43210, I live in Chennai.",
    speechSupported: true,
  },
  {
    id: "hindi",
    code: "hi-IN",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    samplePhrase: "मेरा नाम रवि कुमार है, मेरी उम्र 28 वर्ष है, मैं चेन्नई में रहता हूँ।",
    speechSupported: true,
  },
  {
    id: "telugu",
    code: "te-IN",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    samplePhrase: "నా పేరు రవి కుమార్, నాకు 28 సంవత్సరాలు, నేను చెన్నైలో నివసిస్తున్నాను.",
    speechSupported: true,
  },
  {
    id: "kannada",
    code: "kn-IN",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    samplePhrase: "ನನ್ನ ಹೆಸರು ರವಿ ಕುಮಾರ್, ನನಗೆ 28 ವರ್ಷ, ನಾನು ಚೆನ್ನೈನಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದೇನೆ.",
    speechSupported: true,
  },
  {
    id: "malayalam",
    code: "ml-IN",
    label: "Malayalam",
    nativeLabel: "മലയാളം",
    samplePhrase: "എന്റെ പേര് രവി കുമാർ, എനിക്ക് 28 വയസ്സുണ്ട്, ഞാൻ ചെന്നൈയിലാണ് താമസിക്കുന്നത്.",
    speechSupported: true,
  },
];

export interface LanguageSettings {
  speakingLanguage: string; // The language user speaks
  formLanguage: string;     // The language expected in form fields
  interfaceLanguage: string;// Language of UI labels & navigation
  assistantLanguage: string;// Language of voice/text explanations & errors
}

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  speakingLanguage: "tanglish",
  formLanguage: "english",
  interfaceLanguage: "english",
  assistantLanguage: "english",
};

const STORAGE_KEY = "mozhifill_language_settings_v1";

export function loadLanguageSettings(): LanguageSettings {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LANGUAGE_SETTINGS;
    return { ...DEFAULT_LANGUAGE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LANGUAGE_SETTINGS;
  }
}

export function saveLanguageSettings(settings: LanguageSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to persist language settings", e);
  }
}

/**
 * Normalization dictionary for common Tanglish spoken tokens to standard field semantics.
 */
export const TANGLISH_NORMALIZATION_MAP: Record<string, string> = {
  peru: "fullName",
  peyar: "fullName",
  name: "fullName",
  vayasu: "age",
  age: "age",
  oor: "city",
  ooru: "city",
  city: "city",
  aan: "Male",
  gand: "Male",
  pen: "Female",
  pombala: "Female",
  aanu: "Male",
  ponnu: "Female",
  velai: "occupation",
  job: "occupation",
  phone: "phone",
  mobile: "phone",
  cell: "phone",
  address: "address",
  mugavari: "address",
  pin: "pincode",
  pincode: "pincode",
  post: "pincode",
  email: "email",
  mail: "email",
};

/**
 * Normalizes input text according to common Tanglish tokens
 */
export function normalizeTanglishInput(text: string): string {
  if (!text) return "";
  let clean = text.trim();
  // normalize spoken numbers if any
  clean = clean
    .replace(/\bzero\b/gi, "0")
    .replace(/\bone\b/gi, "1")
    .replace(/\btwo\b/gi, "2")
    .replace(/\bthree\b/gi, "3")
    .replace(/\bfour\b/gi, "4")
    .replace(/\bfive\b/gi, "5")
    .replace(/\bsix\b/gi, "6")
    .replace(/\bseven\b/gi, "7")
    .replace(/\beight\b/gi, "8")
    .replace(/\bnine\b/gi, "9")
    .replace(/\bat\b/gi, "@")
    .replace(/\bdot\b/gi, ".");
  return clean;
}
