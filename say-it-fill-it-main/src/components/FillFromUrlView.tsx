import { useState } from "react";
import {
  Link2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { inspectFormUrl, UrlCompatibilityResult } from "@/lib/url-checker";

interface FillFromUrlViewProps {
  onStartAssistance: (url: string) => void;
}

export function FillFromUrlView({ onStartAssistance }: FillFromUrlViewProps) {
  const [urlInput, setUrlInput] = useState<string>("https://tneaonline.org/admission");
  const [analysis, setAnalysis] = useState<UrlCompatibilityResult | null>(() =>
    inspectFormUrl("https://tneaonline.org/admission")
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleInspect = (e: React.FormEvent) => {
    e.preventDefault();
    const result = inspectFormUrl(urlInput);
    setAnalysis(result);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
            <Link2 className="mr-1 h-3 w-3" /> Fill from URL
          </Badge>
          <span className="text-xs text-muted-foreground">• External Form Assistant</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Assisted External Form Filling
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Provide a URL to an external form. MozhiFill AI inspects compatibility, provides structured speech-to-field extraction, and enables guided one-click copy assistance.
        </p>
      </div>

      {/* URL Input Bar */}
      <Card className="border shadow-none">
        <CardContent className="pt-6">
          <form onSubmit={handleInspect} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/admission-form"
                className="pl-9 text-xs rounded-xl h-10"
              />
            </div>
            <Button type="submit" size="sm" className="h-10 px-5 text-xs font-semibold rounded-xl">
              Inspect Compatibility
            </Button>
          </form>

          <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Security enforcement: External sites require HTTPS. Private IPs and cloud metadata are strictly blocked.
          </p>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Status Card */}
            <Card className="border shadow-none md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {analysis.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    Compatibility Analysis
                  </CardTitle>
                  <Badge
                    variant={analysis.recommendedMode === "guided" ? "secondary" : "default"}
                    className="text-[10px] uppercase font-bold"
                  >
                    Mode C: Guided Assistance
                  </Badge>
                </div>
                <CardDescription className="text-xs pt-1">
                  Target Domain: <span className="font-mono font-semibold text-foreground">{analysis.hostname || "External"}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className={`rounded-xl p-3 text-xs leading-relaxed ${
                    analysis.statusType === "error"
                      ? "bg-destructive/10 text-destructive"
                      : analysis.statusType === "warning"
                      ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {analysis.statusMessage}
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-foreground mb-1.5">How this works:</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {analysis.guidanceSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Quick Action Card */}
            <Card className="border shadow-none flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Launch Workspace</CardTitle>
                <CardDescription className="text-xs">
                  Ready to speak your details for this form?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  MozhiFill AI will load standard matching fields so you can speak in Tamil, English, or Tanglish, review values, and easily copy each item.
                </p>
                <Button
                  onClick={() => onStartAssistance(analysis.url)}
                  disabled={!analysis.isValid}
                  className="w-full text-xs font-semibold rounded-xl gap-2 shadow-sm"
                >
                  Start Guided Voice Fill <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Detected Fields Preview */}
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">
                Assisted Form Fields ({analysis.detectedFields.length} Detected)
              </CardTitle>
              <CardDescription className="text-xs">
                These fields will be extracted from your spoken audio for this form.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {analysis.detectedFields.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-xl border bg-muted/40 p-2.5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground block">{f.label}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{f.type}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Ready</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
