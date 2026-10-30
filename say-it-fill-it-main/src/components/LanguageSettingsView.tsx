import { useState, useEffect } from "react";
import {
  Languages,
  Check,
  Volume2,
  Info,
  Sparkles,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LanguageSettings,
  saveLanguageSettings,
  SUPPORTED_LANGUAGES,
  TANGLISH_NORMALIZATION_MAP,
} from "@/lib/languages";
import { detectSpeechVoices, VoiceInfo } from "@/lib/speech-tts";

interface LanguageSettingsViewProps {
  settings: LanguageSettings;
  onUpdateSettings: (settings: LanguageSettings) => void;
}

export function LanguageSettingsView({
  settings,
  onUpdateSettings,
}: LanguageSettingsViewProps) {
  const [current, setCurrent] = useState<LanguageSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState<VoiceInfo>({
    hasTamilVoice: false,
    voiceName: "Checking...",
    langCode: "en",
  });

  useEffect(() => {
    setCurrent(settings);
    setVoiceInfo(detectSpeechVoices());
  }, [settings]);

  const handleSave = () => {
    saveLanguageSettings(current);
    onUpdateSettings(current);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
            <Languages className="mr-1 h-3 w-3" /> Independent Multilingual Engine
          </Badge>
          <span className="text-xs text-muted-foreground">• 4-Tier Language Separation</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Language Configuration
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Configure independent source, target, interface, and assistant languages. MozhiFill AI isolates what you speak from the form's destination language.
        </p>
      </div>

      {/* 4-Tier Independent Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Tier A: Speaking Language */}
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <Badge variant="secondary" className="w-fit text-[10px] font-bold">Tier A: Source</Badge>
            <CardTitle className="text-base font-bold text-foreground">Speaking Language</CardTitle>
            <CardDescription className="text-xs">
              The language you speak into the microphone during voice recording.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={current.speakingLanguage}
              onValueChange={(val) => setCurrent({ ...current, speakingLanguage: val })}
            >
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue placeholder="Select speaking language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">
                    {l.label} ({l.nativeLabel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Primary: Tamil, Indian English, Tanglish. Extended: Hindi, Telugu, Kannada, Malayalam.
            </p>
          </CardContent>
        </Card>

        {/* Tier B: Form Output Language */}
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <Badge variant="secondary" className="w-fit text-[10px] font-bold">Tier B: Target</Badge>
            <CardTitle className="text-base font-bold text-foreground">Form Target Language</CardTitle>
            <CardDescription className="text-xs">
              The language required by the fields in your selected form.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={current.formLanguage}
              onValueChange={(val) => setCurrent({ ...current, formLanguage: val })}
            >
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue placeholder="Select form language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english" className="text-xs">English (Standard / Latin Script)</SelectItem>
                <SelectItem value="tamil" className="text-xs">Tamil (தமிழ் எழுத்துரு)</SelectItem>
                <SelectItem value="hindi" className="text-xs">Hindi (देवनागरी)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Entities (names, cities, occupations) are transliterated/normalized into this target language.
            </p>
          </CardContent>
        </Card>

        {/* Tier C: Interface Language */}
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <Badge variant="secondary" className="w-fit text-[10px] font-bold">Tier C: Navigation</Badge>
            <CardTitle className="text-base font-bold text-foreground">Interface Language</CardTitle>
            <CardDescription className="text-xs">
              The language used for UI navigation, field headers, and buttons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={current.interfaceLanguage}
              onValueChange={(val) => setCurrent({ ...current, interfaceLanguage: val })}
            >
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue placeholder="Select interface language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english" className="text-xs">English</SelectItem>
                <SelectItem value="tamil" className="text-xs">தமிழ் (Tamil)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Form labels display dual English and Tamil translations where configured.
            </p>
          </CardContent>
        </Card>

        {/* Tier D: Assistant Response & Read-Back */}
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <Badge variant="secondary" className="w-fit text-[10px] font-bold">Tier D: Feedback</Badge>
            <CardTitle className="text-base font-bold text-foreground">Assistant Feedback Language</CardTitle>
            <CardDescription className="text-xs">
              Language for spoken read-back, errors, and validation guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={current.assistantLanguage}
              onValueChange={(val) => setCurrent({ ...current, assistantLanguage: val })}
            >
              <SelectTrigger className="text-xs rounded-xl">
                <SelectValue placeholder="Select assistant language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english" className="text-xs">English</SelectItem>
                <SelectItem value="tamil" className="text-xs">தமிழ் (Tamil)</SelectItem>
              </SelectContent>
            </Select>
            <div className="rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Browser Speech Voice:</span>
              <span className="font-semibold text-foreground">{voiceInfo.voiceName}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Concrete Workflow Example Card */}
      <Card className="border shadow-none bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> End-to-End Workflow Demonstration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong>Speaking:</strong> Tamil (தமிழ்) &nbsp;|&nbsp; <strong>Form Target:</strong> English &nbsp;|&nbsp; <strong>Interface:</strong> Tamil &nbsp;|&nbsp; <strong>Assistant:</strong> Tamil
          </p>
          <p className="leading-relaxed">
            When you say: <em>"என் பெயர் ரவி குமார், எனக்கு 28 வயது, நான் சென்னையில் இருக்கிறேன்"</em>, MozhiFill AI transcribes the Tamil speech, extracts the details into English Roman values (<code>fullName: "Ravi Kumar"</code>, <code>age: "28"</code>, <code>city: "Chennai"</code>), and reads back the confirmation in Tamil.
          </p>
        </CardContent>
      </Card>

      {/* Tanglish Normalization Glossary */}
      <Card className="border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" /> Tanglish Spoken Normalization Glossary
          </CardTitle>
          <CardDescription className="text-xs">
            MozhiFill AI recognizes colloquial mixed Tamil-English tokens and normalizes them into standard schema fields.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">peru / peyar</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ Full Name</span>
            </div>
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">vayasu</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ Age</span>
            </div>
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">oor / ooru</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ City / Town</span>
            </div>
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">velai / job</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ Occupation</span>
            </div>
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">aan / aanu</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ Gender: Male</span>
            </div>
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">pen / ponnu</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ Gender: Female</span>
            </div>
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">mugavari</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ Address</span>
            </div>
            <div className="rounded-lg border p-2 bg-muted/30">
              <span className="font-mono font-semibold text-primary">at / dot</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">→ @ / . (Email)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} className="font-semibold text-xs px-6 rounded-xl shadow-sm gap-2">
          <Check className="h-4 w-4" /> Save Language Preferences
        </Button>
        {savedSuccess && (
          <span className="text-xs text-emerald-600 font-medium animate-in fade-in">
            Preferences saved to local storage!
          </span>
        )}
      </div>
    </div>
  );
}
