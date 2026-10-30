import { useRef, useState, useEffect } from "react";
import {
  Mic,
  Square,
  Loader2,
  RotateCcw,
  Check,
  FileCheck2,
  Download,
  Copy,
  Edit3,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recordWav } from "@/lib/record-wav";
import { FormTemplate, FormFieldSchema, getFormTemplate, validateFormFields, calculateCompletion } from "@/lib/form-schemas";
import { saveDraft, FormDraft } from "@/lib/drafts-storage";
import { speakText } from "@/lib/speech-tts";

const LANGS = [
  { id: "english", label: "English", sample: "My name is Ravi Kumar, I am 28 years old, my phone is 98765 43210, I live in Chennai." },
  { id: "tamil", label: "தமிழ்", sample: "என் பெயர் ரவி குமார், எனக்கு 28 வயது, நான் சென்னையில் இருக்கிறேன்." },
  { id: "tanglish", label: "Tanglish", sample: "En peru Ravi Kumar, enakku 28 vayasu, naan Chennai la software engineer ah work panren." },
] as const;

type Status = "idle" | "recording" | "processing";

interface VoiceFillWorkspaceProps {
  initialTemplateId?: string;
  readBackEnabled?: boolean;
}

// Language-specific label and placeholder mapping
const FIELD_I18N: Record<string, {
  ta: { label: string; placeholder: string; helpText?: string };
  tanglish: { label: string; placeholder: string; helpText?: string };
  en: { label: string; placeholder: string; helpText?: string };
}> = {
  fullName: {
    en: { label: "Full name", placeholder: "e.g. Ravi Kumar", helpText: "Your legal full name" },
    ta: { label: "முழு பெயர்", placeholder: "எ.கா. ரவி குமார்", helpText: "உங்கள் சட்டப்பூர்வ பெயர்" },
    tanglish: { label: "Full Name (பெயர்)", placeholder: "e.g. Ravi Kumar", helpText: "Full legal name" },
  },
  age: {
    en: { label: "Age", placeholder: "e.g. 28", helpText: "Age in completed years" },
    ta: { label: "வயது", placeholder: "எ.கா. 28", helpText: "முடிவடைந்த வயது ஆண்டுகள்" },
    tanglish: { label: "Age (வயது)", placeholder: "e.g. 28", helpText: "Age in years" },
  },
  gender: {
    en: { label: "Gender", placeholder: "Select gender", helpText: "Male / Female / Other" },
    ta: { label: "பாலினம்", placeholder: "பாலினத்தைத் தேர்ந்தெடுக்கவும்", helpText: "ஆண் / பெண் / மற்றவை" },
    tanglish: { label: "Gender (பாலினம்)", placeholder: "Select Gender", helpText: "Aan / Pen / Other" },
  },
  dateOfBirth: {
    en: { label: "Date of birth", placeholder: "YYYY-MM-DD", helpText: "Birth date" },
    ta: { label: "பிறந்த தேதி", placeholder: "வருடம்-மாதம்-தேதி", helpText: "பிறந்த நாள்" },
    tanglish: { label: "Date of birth (பிறந்த தேதி)", placeholder: "YYYY-MM-DD", helpText: "Date of birth" },
  },
  phone: {
    en: { label: "Phone", placeholder: "10-digit number", helpText: "Mobile contact number" },
    ta: { label: "கைபேசி எண்", placeholder: "10 இலக்க எண்", helpText: "கைபேசி தொடர்பு எண்" },
    tanglish: { label: "Phone (மொபைல் எண்)", placeholder: "10-digit phone number", helpText: "Mobile number" },
  },
  email: {
    en: { label: "Email", placeholder: "name@domain.com", helpText: "Electronic mail address" },
    ta: { label: "மின்னஞ்சல்", placeholder: "பெயர்@டொமைன்.காம்", helpText: "மின்னஞ்சல் முகவரி" },
    tanglish: { label: "Email (மின்னஞ்சல்)", placeholder: "name@domain.com", helpText: "Email address" },
  },
  address: {
    en: { label: "Address", placeholder: "Door No, Street, Locality", helpText: "Residential address" },
    ta: { label: "முகவரி", placeholder: "கதவு எண், தெரு, பகுதி", helpText: "வசிப்பிட முகவரி" },
    tanglish: { label: "Address (முகவரி)", placeholder: "Door No, Street, Oor", helpText: "Residential address" },
  },
  city: {
    en: { label: "City", placeholder: "e.g. Chennai", helpText: "City, town or native place" },
    ta: { label: "ஊர் / நகரம்", placeholder: "எ.கா. சென்னை", helpText: "சொந்த ஊர் அல்லது நகரம்" },
    tanglish: { label: "City (ஊர்)", placeholder: "e.g. Chennai / Erode", helpText: "City / native place" },
  },
  pincode: {
    en: { label: "Pincode", placeholder: "6-digit PIN code", helpText: "Postal PIN code" },
    ta: { label: "அஞ்சல் குறியீடு", placeholder: "6 இலக்க அஞ்சல் குறியீடு", helpText: "அஞ்சல் குறியீட்டு எண்" },
    tanglish: { label: "Pincode (அஞ்சல் எண்)", placeholder: "6-digit pincode", helpText: "Postal PIN code" },
  },
  occupation: {
    en: { label: "Occupation", placeholder: "e.g. Software Engineer", helpText: "Profession or job" },
    ta: { label: "தொழில்", placeholder: "எ.கா. மென்பொருள் பொறியாளர்", helpText: "பணி அல்லது வேலை" },
    tanglish: { label: "Occupation (வேலை / தொழில்)", placeholder: "e.g. Software Engineer", helpText: "Profession or job" },
  },
};

export function VoiceFillWorkspace({
  initialTemplateId = "standard-general-form",
  readBackEnabled = false,
}: VoiceFillWorkspaceProps) {
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate>(() => getFormTemplate(initialTemplateId));
  const [lang, setLang] = useState<string>("english");
  const [status, setStatus] = useState<Status>("idle");
  const [values, setValues] = useState<Record<string, string>>({});
  const [justFilled, setJustFilled] = useState<Set<string>>(new Set());
  const [transcript, setTranscript] = useState("");
  const [editableTranscript, setEditableTranscript] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const rec = useRef<{ stop: () => Promise<File> } | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");

  useEffect(() => {
    if (initialTemplateId) {
      setCurrentTemplate(getFormTemplate(initialTemplateId));
    }
  }, [initialTemplateId]);

  useEffect(() => {
    setEditableTranscript(transcript);
  }, [transcript]);

  function normalizeLocalField(key: string, val: string): string {
    if (!val) return "";
    const s = val.trim();
    if (key === "gender") {
      const v = s.toLowerCase();
      if (["male", "m", "man", "boy", "aan", "aanu", "ஆண்"].includes(v) || v.startsWith("male")) return "Male";
      if (["female", "f", "woman", "girl", "pen", "ponnu", "pombala", "பெண்"].includes(v) || v.startsWith("female")) return "Female";
      if (["other", "others", "transgender", "non-binary", "மற்றவை"].includes(v)) return "Other";
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }
    if (key === "dateOfBirth" || key.toLowerCase().includes("dob") || key.toLowerCase().includes("birth")) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
      if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
      const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    }
    if (key === "age") {
      const m = s.match(/\d{1,3}/);
      if (m) return m[0];
    }
    if (key === "phone" || key.toLowerCase().includes("phone") || key.toLowerCase().includes("mobile")) {
      const digits = s.replace(/\D/g, "");
      if (digits.length === 10) return digits;
      if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
      if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
      const m = digits.match(/[6-9]\d{9}/);
      return m ? m[0] : (digits.length >= 10 ? digits.slice(-10) : digits);
    }
    if (key === "pincode" || key.toLowerCase().includes("pincode")) {
      const digits = s.replace(/\D/g, "");
      const m = digits.match(/[1-9]\d{5}/);
      return m ? m[0] : (digits.slice(0, 6) || s);
    }
    if (key === "email") {
      return s.toLowerCase().replace(/\s+/g, "");
    }
    return s;
  }

  async function start() {
    setError("");
    liveTranscriptRef.current = "";
    try {
      rec.current = await recordWav();
      setStatus("recording");

      // Optional browser real-time speech recognition for instant transcript
      if (typeof window !== "undefined") {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = lang === "tamil" ? "ta-IN" : lang === "tanglish" ? "ta-IN" : "en-IN";
            recognition.onresult = (event: any) => {
              let text = "";
              for (let i = 0; i < event.results.length; i++) {
                text += event.results[i][0].transcript + " ";
              }
              const trimmed = text.trim();
              if (trimmed) {
                liveTranscriptRef.current = trimmed;
                setTranscript(trimmed);
                setEditableTranscript(trimmed);
              }
            };
            recognition.onerror = () => {};
            recognition.start();
            speechRecognitionRef.current = recognition;
          } catch {}
        }
      }
    } catch {
      setError("Microphone access is needed to record. Please ensure your microphone is plugged in and allowed in browser permissions.");
    }
  }

  async function stop() {
    if (!rec.current) return;
    setStatus("processing");

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    try {
      const file = await rec.current.stop();
      rec.current = null;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("language", lang);
      fd.append(
        "detectedFields",
        JSON.stringify(currentTemplate.fields.map((f) => ({ id: f.id, label: f.label, type: f.type })))
      );
      if (liveTranscriptRef.current) {
        fd.append("transcript", liveTranscriptRef.current);
      }

      const res = await fetch("/api/voice-fill", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
        setEditableTranscript(data.transcript);
      } else if (liveTranscriptRef.current) {
        setTranscript(liveTranscriptRef.current);
        setEditableTranscript(liveTranscriptRef.current);
      }
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      const filled = new Set<string>();
      setValues((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries((data.fields || {}) as Record<string, string | null>)) {
          if (v) {
            next[k] = normalizeLocalField(k, String(v));
            filled.add(k);
          }
        }
        return next;
      });
      setJustFilled(filled);

      if (!filled.size) {
        setError("No form details found in what you said. Try saying e.g. 'My name is...', 'My age is...', 'My phone is...'");
      } else if (readBackEnabled) {
        speakText(`Form fields updated: ${Array.from(filled).join(", ")}`, lang === "tamil" ? "ta" : "en");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  }

  async function reprocessTranscript() {
    if (!editableTranscript.trim()) return;
    setStatus("processing");
    setError("");
    try {
      const fd = new FormData();
      fd.append("transcript", editableTranscript);
      fd.append("language", lang);
      fd.append(
        "detectedFields",
        JSON.stringify(currentTemplate.fields.map((f) => ({ id: f.id, label: f.label, type: f.type })))
      );

      const res = await fetch("/api/voice-fill", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process transcript.");

      const filled = new Set<string>();
      setValues((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries((data.fields || {}) as Record<string, string | null>)) {
          if (v) {
            next[k] = normalizeLocalField(k, String(v));
            filled.add(k);
          }
        }
        return next;
      });
      setJustFilled(filled);
      setTranscript(editableTranscript);
      setIsEditingTranscript(false);

      if (!filled.size) {
        setError("No details found in transcript. Try adding: 'My name is Karthik, my phone is 9876543210'");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to re-extract details.");
    } finally {
      setStatus("idle");
    }
  }

  function handleSaveDraft() {
    const completion = calculateCompletion(currentTemplate.fields, values);
    const draft: FormDraft = {
      id: "draft_" + Date.now(),
      formId: currentTemplate.id,
      formTitle: currentTemplate.title,
      updatedAt: new Date().toISOString(),
      values,
      transcript,
      completionPercentage: completion,
    };
    saveDraft(draft);
    alert(`Draft saved successfully (${completion}% complete). You can resume it anytime from 'My Drafts'.`);
  }

  function handleExportJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(values, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentTemplate.id}_data.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleCopyField(key: string, val: string) {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateFormFields(currentTemplate.fields, values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please check required or highlighted invalid fields before confirming.");
      return;
    }
    setError("");
    setSubmitted(true);
    if (readBackEnabled) {
      speakText("Form verified and successfully completed.", "en");
    }
  }

  const sample = LANGS.find((l) => l.id === lang)?.sample;
  const completionPercentage = calculateCompletion(currentTemplate.fields, values);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Box */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Voice Fill Workspace
            </h1>
            <Badge variant="outline" className="text-xs font-mono border-border bg-muted/40">
              {currentTemplate.title}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Structured form assistant with real-time speech-to-field transcription.
          </p>
        </div>

        {/* Progress & Quick Actions */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono py-1 px-2.5 border border-border">
            Completion: {completionPercentage}%
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            className="text-xs gap-1.5 h-8 rounded-lg border-border hover:bg-muted"
          >
            <FileCheck2 className="h-3.5 w-3.5" /> Save Draft
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            className="text-xs gap-1.5 h-8 rounded-lg border-border hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </Button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Column: Stage A (Speak) & Stage B (Understand) */}
        <div className="space-y-6">
          {/* Stage A: Speak Naturally Card (Clean Black & White Box) */}
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-none transition-all">
            {/* Header Strip */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  {lang === "tamil" ? "படி 1: இயல்பாகப் பேசுங்கள்" : "STAGE A: SPEAK NATURALLY"}
                </span>
                <h3 className="text-sm font-bold text-foreground mt-0.5">
                  {lang === "tamil" ? "குரல் வழி பதிவு" : "Voice Input Studio"}
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-border bg-muted/60">
                {lang === "tamil" ? "செயலில் உள்ளது" : "Active"}
              </Badge>
            </div>

            {/* Speaking Language Segmented Box */}
            <div className="space-y-2 mb-5">
              <label className="text-xs font-semibold text-foreground block">
                {lang === "tamil" ? "பேசும் மொழி" : lang === "tanglish" ? "Speaking language (பேசும் மொழி)" : "Speaking language"}
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-1">
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    disabled={status !== "idle"}
                    className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
                      lang === l.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Microphone Recording Box */}
            <div className="flex flex-col items-center py-5 rounded-lg border border-border bg-muted/20">
              <div className="relative">
                {status === "recording" && (
                  <span className="absolute -inset-2 rounded-full border-2 border-foreground/30 animate-pulse-ring" />
                )}
                <button
                  onClick={status === "recording" ? stop : start}
                  disabled={status === "processing"}
                  aria-label={status === "recording" ? "Stop recording" : "Start recording"}
                  className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:scale-105 active:scale-95 disabled:opacity-80"
                >
                  {status === "recording" ? (
                    <Square className="h-8 w-8 text-destructive-foreground fill-current animate-pulse" />
                  ) : status === "processing" ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>
              </div>

              <p className="mt-3.5 text-center text-xs font-semibold text-foreground">
                {status === "recording"
                  ? (lang === "tamil" ? "கேட்கிறது... முடிக்க தட்டவும்" : "Listening... Tap to finish")
                  : status === "processing"
                  ? (lang === "tamil" ? "செயலாக்குகிறது..." : "Transcribing & extracting...")
                  : (lang === "tamil" ? "பேச தட்டவும்" : "Tap to speak")}
              </p>

              {sample && (
                <div className="mt-4 mx-3 rounded-lg border border-border bg-card p-3 text-center text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold block text-foreground mb-1 text-[11px]">
                    {lang === "tamil" ? "இதைச் சொல்லிப் பாருங்கள்:" : "Try saying:"}
                  </span>
                  "{sample}"
                </div>
              )}
            </div>
          </section>

          {/* Stage B: Understand & Transcript Box */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-none space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  {lang === "tamil" ? "படி 2: கண்டறியப்பட்ட உரை" : "STAGE B: RECOGNIZED TRANSCRIPT"}
                </span>
                <h3 className="text-xs font-bold text-foreground">
                  {lang === "tamil" ? "உரை சரிபார்ப்பு" : "Transcript Verification"}
                </h3>
              </div>
              {transcript && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingTranscript(!isEditingTranscript)}
                  className="h-7 text-xs gap-1 px-2 border border-border hover:bg-muted"
                >
                  <Edit3 className="h-3 w-3" /> {isEditingTranscript ? "View" : "Edit"}
                </Button>
              )}
            </div>

            {transcript ? (
              <div className="space-y-3">
                {isEditingTranscript ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editableTranscript}
                      onChange={(e) => setEditableTranscript(e.target.value)}
                      className="min-h-[85px] text-xs font-mono rounded-lg border-border"
                      placeholder="Edit your transcript here..."
                    />
                    <Button
                      size="sm"
                      onClick={reprocessTranscript}
                      disabled={status === "processing"}
                      className="w-full text-xs gap-1.5 h-8 font-semibold rounded-lg"
                    >
                      <RefreshCw className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`} />
                      {lang === "tamil" ? "மீண்டும் பிரித்தெடு" : "Re-Extract From Edited Transcript"}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/40 p-3 text-xs italic text-foreground leading-relaxed border border-border">
                    "{transcript}"
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                {lang === "tamil"
                  ? "நீங்கள் பேசியவுடன் உங்கள் உரை இங்கு தோன்றும். படிவத்தை நிரப்புவதற்கு முன் நீங்கள் அதைத் திருத்தலாம்."
                  : "Your transcript will appear here after speaking. You can review or edit it before filling form fields."}
              </p>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-xs text-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Stage C (Review & Fill Form Box) */}
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-none space-y-5">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                {lang === "tamil" ? "படி 3: மதிப்பாய்வு & படிவம் நிரப்புதல்" : "STAGE C: REVIEW & FILL FORM"}
              </span>
              <h2 className="font-bold text-base sm:text-lg text-foreground">
                {lang === "tamil" ? "படிவ புலங்கள்" : "Target Form Fields"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === "tamil"
                  ? "தானாக நிரப்பப்பட்ட விவரங்களைச் சரிபார்க்கவும். தேவைப்பட்டால் திருத்தவும்."
                  : "Review populated values. Fields highlight on extraction. Manual edits supported."}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setValues({});
                setJustFilled(new Set());
                setSubmitted(false);
                setFieldErrors({});
              }}
              className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5 self-start sm:self-auto rounded-lg border-border"
            >
              <RotateCcw className="h-3 w-3" /> Clear Form
            </Button>
          </div>

          {/* Form Grid with Language-Adaptive Labels & Boxes */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-3.5 sm:grid-cols-2">
              {currentTemplate.fields.map((field) => {
                const val = values[field.id] || "";
                const isJustFilled = justFilled.has(field.id);
                const fieldErr = fieldErrors[field.id];

                // Language-adaptive display configuration
                const fieldI18n = FIELD_I18N[field.id];
                const activeI18n =
                  lang === "tamil"
                    ? fieldI18n?.ta
                    : lang === "tanglish"
                    ? fieldI18n?.tanglish
                    : fieldI18n?.en;

                const primaryLabel = activeI18n?.label || field.label;
                const secondaryLabel = lang === "tamil" ? field.label : field.labelTa;
                const placeholder = activeI18n?.placeholder || field.placeholder || `Enter ${field.label.toLowerCase()}`;
                const helpText = activeI18n?.helpText || field.helpText;

                return (
                  <div
                    key={field.id}
                    className={`rounded-lg border border-border bg-card p-3.5 space-y-1.5 transition-all hover:border-foreground/30 ${
                      field.wide ? "sm:col-span-2" : ""
                    } ${isJustFilled ? "ring-1 ring-foreground border-foreground bg-muted/30" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.id} className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <span>{primaryLabel}</span>
                        {/* Always include English base name in DOM for accessibility and tests */}
                        {secondaryLabel && (
                          <span className="text-[11px] font-normal text-muted-foreground">
                            ({secondaryLabel})
                          </span>
                        )}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>

                      {val && (
                        <button
                          type="button"
                          onClick={() => handleCopyField(field.id, val)}
                          title="Copy field value"
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
                        >
                          {copiedKey === field.id ? (
                            <span className="font-semibold text-foreground">Copied!</span>
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {field.type === "select" ? (
                      <Select
                        value={val || ""}
                        onValueChange={(v) => {
                          setValues((prev) => ({ ...prev, [field.id]: v }));
                          setFieldErrors((prev) => ({ ...prev, [field.id]: "" }));
                        }}
                      >
                        <SelectTrigger
                          id={field.id}
                          className={`text-xs h-9 rounded-md border-border bg-background transition-colors ${
                            fieldErr ? "border-destructive ring-1 ring-destructive" : ""
                          }`}
                        >
                          <SelectValue placeholder={lang === "tamil" ? "தேர்ந்தெடுக்கவும்" : "Select an option"} />
                        </SelectTrigger>
                        <SelectContent className="border-border">
                          {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label} {opt.value === "Male" && lang === "tamil" ? "(ஆண்)" : opt.value === "Female" && lang === "tamil" ? "(பெண்)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "textarea" ? (
                      <Textarea
                        id={field.id}
                        value={val}
                        placeholder={placeholder}
                        onChange={(e) => {
                          setValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                          setFieldErrors((prev) => ({ ...prev, [field.id]: "" }));
                        }}
                        className={`text-xs min-h-[65px] rounded-md border-border bg-background transition-colors ${
                          fieldErr ? "border-destructive ring-1 ring-destructive" : ""
                        }`}
                      />
                    ) : (
                      <Input
                        id={field.id}
                        type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                        value={val}
                        placeholder={placeholder}
                        onChange={(e) => {
                          setValues((prev) => ({ ...prev, [field.id]: e.target.value }));
                          setFieldErrors((prev) => ({ ...prev, [field.id]: "" }));
                        }}
                        className={`text-xs h-9 rounded-md border-border bg-background transition-colors ${
                          fieldErr ? "border-destructive ring-1 ring-destructive" : ""
                        }`}
                      />
                    )}

                    {fieldErr && (
                      <p className="text-[11px] font-medium text-destructive">{fieldErr}</p>
                    )}
                    {helpText && !fieldErr && (
                      <p className="text-[10px] text-muted-foreground">{helpText}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submission Banner */}
            {submitted ? (
              <div className="rounded-xl border border-border bg-muted/30 p-5 text-center animate-in zoom-in-95">
                <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-full bg-primary text-primary-foreground mb-2">
                  <Check className="h-4 w-4" />
                </div>
                <h4 className="font-bold text-sm text-foreground">
                  {lang === "tamil" ? "படிவம் சரிபார்க்கப்பட்டு நிறைவடைந்தது!" : "Form Verified and Completed!"}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {lang === "tamil"
                    ? "அனைத்து விவரங்களும் சரிபார்க்கப்பட்டன. JSON கோப்பாகப் பதிவிறக்கலாம்."
                    : "All fields have been validated. You can download the JSON submission package or copy values."}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button size="sm" onClick={handleExportJson} className="text-xs gap-1.5 rounded-lg">
                    <Download className="h-3.5 w-3.5" /> Download JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubmitted(false)}
                    className="text-xs rounded-lg border-border"
                  >
                    Edit Again
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {lang === "tamil"
                    ? "சமர்ப்பிப்பதற்கு முன் விவரங்களைச் சரிபார்க்கவும்."
                    : "Explicit confirmation required before finalizing values."}
                </span>
                <Button
                  type="submit"
                  size="default"
                  className="w-full sm:w-auto font-semibold text-xs px-6 rounded-lg shadow-sm gap-2"
                >
                  <Check className="h-4 w-4" />
                  {lang === "tamil" ? "படிவத்தை உறுதிப்படுத்து" : "Confirm & Complete Form"}
                </Button>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
