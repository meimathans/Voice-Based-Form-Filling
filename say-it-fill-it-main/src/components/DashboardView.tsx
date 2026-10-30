import { useState, useEffect } from "react";
import {
  Mic,
  Link2,
  FolderKanban,
  FileText,
  Building2,
  GraduationCap,
  Award,
  HeartPulse,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FORM_TEMPLATES, FormTemplate } from "@/lib/form-schemas";
import { loadAllDrafts, FormDraft } from "@/lib/drafts-storage";
import { LanguageSettings } from "@/lib/languages";

interface DashboardViewProps {
  onStartVoice: (templateId?: string) => void;
  onGoToUrl: () => void;
  onGoToHub: () => void;
  onGoToSettings: () => void;
  onGoToPdf?: () => void;
  languageSettings: LanguageSettings;
}

export function DashboardView({
  onStartVoice,
  onGoToUrl,
  onGoToHub,
  onGoToSettings,
  onGoToPdf,
  languageSettings,
}: DashboardViewProps) {
  const [drafts, setDrafts] = useState<FormDraft[]>([]);

  useEffect(() => {
    setDrafts(loadAllDrafts());
  }, []);

  const categoryHighlights = [
    { id: "general", label: "General Intake", count: 1, icon: FileText, desc: "Personal info, address, contact" },
    { id: "government", label: "Government Services", count: 1, icon: Building2, desc: "Public welfare demo templates" },
    { id: "education", label: "College Admission", count: 1, icon: GraduationCap, desc: "Higher education applications" },
    { id: "scholarships", label: "Scholarships & Aid", count: 1, icon: Award, desc: "Student financial assistance" },
    { id: "healthcare", label: "Healthcare Intake", count: 1, icon: HeartPulse, desc: "Clinical & outpatient forms" },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <Badge variant="outline" className="mb-3 border-border text-foreground bg-muted/40 font-mono text-[10px]">
            Enterprise Multilingual Platform
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Speak Naturally. Fill Any Supported Form. In Your Language.
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Eliminate tedious manual data entry. Speak in <strong>English</strong>, <strong>தமிழ் (Tamil)</strong>, or{" "}
            <strong>Tanglish</strong>, review extracted details with transparent verification, and confirm fields before submission.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => onStartVoice()}
              size="default"
              className="rounded-lg px-5 font-semibold shadow-sm gap-2 text-xs"
            >
              <Mic className="h-3.5 w-3.5" /> Start with Voice
            </Button>
            <Button
              onClick={onGoToUrl}
              variant="outline"
              size="default"
              className="rounded-lg font-semibold gap-2 border-border hover:bg-muted text-xs"
            >
              <Link2 className="h-3.5 w-3.5" /> Paste Form URL
            </Button>
            {onGoToPdf && (
              <Button
                onClick={onGoToPdf}
                variant="outline"
                size="default"
                className="rounded-lg font-semibold gap-2 border-border hover:bg-muted text-xs"
              >
                <FileText className="h-3.5 w-3.5" /> PDF Form Voice Fill
              </Button>
            )}
            <Button
              onClick={onGoToHub}
              variant="ghost"
              size="default"
              className="rounded-lg font-medium text-muted-foreground hover:text-foreground gap-1.5 text-xs"
            >
              <FolderKanban className="h-3.5 w-3.5" /> Browse 6+ Templates
            </Button>
          </div>
        </div>
      </section>

      {/* Language Configuration & System Status Strip */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border shadow-none rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Speaking Language</CardDescription>
            <CardTitle className="text-sm font-bold capitalize flex items-center justify-between">
              {languageSettings.speakingLanguage}
              <Badge variant="secondary" className="text-[10px] font-mono border border-border">Source</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Speech recognition input engine</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Target Form Language</CardDescription>
            <CardTitle className="text-sm font-bold capitalize flex items-center justify-between">
              {languageSettings.formLanguage}
              <Badge variant="secondary" className="text-[10px] font-mono border border-border">Target</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Language expected in output form</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">AI Extraction Engine</CardDescription>
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              Google Gemini
              <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Multimodal audio & transcript parsing</p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-none rounded-xl flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Language Control</CardDescription>
            <CardTitle className="text-sm font-semibold">4-Tier Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToSettings}
              className="w-full text-xs font-semibold rounded-lg border-border"
            >
              Modify Languages →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 3-Stage How It Works Walkthrough */}
      <section className="space-y-3.5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">How MozhiFill AI Works</h2>
          <p className="text-xs text-muted-foreground">A transparent, user-controlled 3-stage process.</p>
        </div>

        <div className="grid gap-3.5 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-none space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted font-bold text-xs text-foreground">
              1
            </div>
            <h3 className="font-semibold text-xs text-foreground">Stage A: Speak Naturally</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Record spoken audio in English, Tamil, or Tanglish without rigid sentence templates. Real-time audio waveform indicates active recording.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-none space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted font-bold text-xs text-foreground">
              2
            </div>
            <h3 className="font-semibold text-xs text-foreground">Stage B: Understand & Verify</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Inspect the exact recognized transcript. You can edit text before processing and trigger re-extraction without re-recording audio.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-none space-y-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted font-bold text-xs text-foreground">
              3
            </div>
            <h3 className="font-semibold text-xs text-foreground">Stage C: Review & Fill</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Extracted entities populate validated form fields with highlight flashes. Review, make manual or voice corrections, and export or submit.
            </p>
          </div>
        </div>
      </section>

      {/* Form Hub Categories Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Form Templates by Category</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Select a pre-configured template or create custom fields.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onGoToHub} className="text-xs text-primary font-semibold">
            View All Templates →
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categoryHighlights.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                onClick={onGoToHub}
                className="group cursor-pointer rounded-2xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">{cat.count} template</Badge>
                </div>
                <h4 className="mt-3 font-semibold text-sm text-foreground">{cat.label}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{cat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Saved Drafts / Recent Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Recent Drafts</h2>
          <span className="text-xs text-muted-foreground">Locally saved on your device</span>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center bg-card/50">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h4 className="mt-2 text-sm font-semibold">No saved drafts yet</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              When you fill a form or save work in progress, your drafts will appear here for one-click resumption.
            </p>
            <Button
              onClick={() => onStartVoice()}
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl text-xs"
            >
              Start New Form Session
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.slice(0, 3).map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-4 shadow-none space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground truncate">{d.formTitle}</span>
                  <Badge variant="secondary" className="text-[10px]">{d.completionPercentage}%</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Updated {new Date(d.updatedAt).toLocaleDateString()}
                </p>
                <Button
                  onClick={() => onStartVoice(d.formId)}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs mt-2"
                >
                  Resume Draft
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
