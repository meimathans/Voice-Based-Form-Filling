import { useState } from "react";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Trash2,
  CheckCircle2,
  Volume2,
  Keyboard,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { clearAllDrafts, clearActivityHistory } from "@/lib/drafts-storage";

export function PrivacyHelpView() {
  const [consentGranted, setConsentGranted] = useState(true);
  const [clearedNotice, setClearedNotice] = useState("");

  const handleClearAllData = () => {
    if (confirm("Clear all locally stored drafts, session activity, and preferences?")) {
      clearAllDrafts();
      clearActivityHistory();
      localStorage.removeItem("mozhifill_language_settings_v1");
      setClearedNotice("All local drafts, activity logs, and preferences have been cleared.");
      setTimeout(() => setClearedNotice(""), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
            <ShieldCheck className="mr-1 h-3 w-3" /> Privacy & Accessibility
          </Badge>
          <span className="text-xs text-muted-foreground">• Transparency & Trust</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Privacy Policy & Help Guide
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          MozhiFill AI is built with zero persistent audio retention and transparent client-side controls.
        </p>
      </div>

      {clearedNotice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-600 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{clearedNotice}</span>
        </div>
      )}

      {/* Privacy Guarantees */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
              <EyeOff className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">Zero Audio Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your voice recordings are converted to temporary in-memory WAV buffers, streamed over HTTPS for extraction, and discarded immediately. No raw audio files are stored on server disks.
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent mb-2">
              <Lock className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">Local-Only Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Drafts and session logs reside strictly in your browser's private local storage. They are never synchronized to external databases without your explicit export or submission.
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-2">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground">Server-Side Secret Isolation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gemini API keys and server credentials remain strictly on the backend server environment. They are never compiled into client bundles or stored in browser cookies.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Consent & Clear Controls */}
      <Card className="border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">User Consent & Data Governance</CardTitle>
          <CardDescription className="text-xs">
            Manage your consent preferences and exercise your right to delete local data at any time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="consent" className="text-xs font-semibold text-foreground">
                Consent to Process Spoken Audio for Form Assistance
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Required to transcribe speech and extract entities. You can revoke this anytime.
              </p>
            </div>
            <Switch
              id="consent"
              checked={consentGranted}
              onCheckedChange={setConsentGranted}
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t">
            <div>
              <p className="text-xs font-semibold text-foreground">Clear All Local Data</p>
              <p className="text-[11px] text-muted-foreground">Deletes all saved drafts, activity logs, and preferences.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllData}
              className="text-xs text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Purge Local Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility & Navigation Shortcuts */}
      <Card className="border shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" /> Accessibility & Keyboard Navigation
          </CardTitle>
          <CardDescription className="text-xs">
            MozhiFill AI adheres to WCAG accessibility guidelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border p-2.5 bg-muted/30">
              <span className="font-semibold text-foreground block">Tab & Shift+Tab</span>
              <span className="text-[11px] text-muted-foreground">Navigate sequentially through all form fields and action buttons.</span>
            </div>
            <div className="rounded-lg border p-2.5 bg-muted/30">
              <span className="font-semibold text-foreground block">Space / Enter</span>
              <span className="text-[11px] text-muted-foreground">Toggle microphone recording or select buttons.</span>
            </div>
            <div className="rounded-lg border p-2.5 bg-muted/30">
              <span className="font-semibold text-foreground block">Speech Read-Back</span>
              <span className="text-[11px] text-muted-foreground">Toggle the speaker icon in the top navbar to hear filled fields read aloud.</span>
            </div>
            <div className="rounded-lg border p-2.5 bg-muted/30">
              <span className="font-semibold text-foreground block">High Contrast</span>
              <span className="text-[11px] text-muted-foreground">Switch between light and dark themes using the moon/sun toggle in the header.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
