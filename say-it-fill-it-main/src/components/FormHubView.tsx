import { useState } from "react";
import {
  Search,
  FolderKanban,
  FileText,
  Building2,
  GraduationCap,
  Award,
  Briefcase,
  HeartPulse,
  Settings2,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FORM_TEMPLATES, CATEGORIES, FormTemplate } from "@/lib/form-schemas";

interface FormHubViewProps {
  onSelectTemplate: (templateId: string) => void;
}

export function FormHubView({ onSelectTemplate }: FormHubViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTemplates = FORM_TEMPLATES.filter((tpl) => {
    const matchesCat = selectedCategory === "all" || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.titleTa && tpl.titleTa.includes(searchQuery));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border text-foreground bg-muted/40 font-mono text-[10px]">
            <FolderKanban className="mr-1 h-3 w-3" /> Form Hub
          </Badge>
          <span className="text-xs text-muted-foreground">• Categorized Schema Library</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Explore Form Templates
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl">
          Choose from verified standard models and realistic demo templates. Seamlessly map your spoken answers to specific structured fields.
        </p>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by title, keyword, or Tamil..."
            className="pl-9 text-xs rounded-lg border-border"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((tpl) => (
          <Card key={tpl.id} className="flex flex-col justify-between border border-border rounded-xl shadow-none transition hover:border-foreground/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={tpl.status === "verified" ? "default" : "secondary"}
                  className="text-[10px] uppercase font-mono font-bold"
                >
                  {tpl.status}
                </Badge>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {tpl.fields.length} fields
                </span>
              </div>
              <CardTitle className="text-base font-bold mt-2 text-foreground">
                {tpl.title}
              </CardTitle>
              {tpl.titleTa && (
                <p className="text-xs font-medium text-muted-foreground">{tpl.titleTa}</p>
              )}
              <CardDescription className="text-xs mt-1 leading-relaxed">
                {tpl.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {tpl.disclaimer && (
                <div className="flex items-start gap-1.5 rounded-md border border-border bg-muted/40 p-2 text-[10px] text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground" />
                  <span>{tpl.disclaimer}</span>
                </div>
              )}

              {tpl.referenceUrl && (
                <a
                  href={tpl.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-foreground hover:underline font-semibold"
                >
                  Official Reference Portal <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex gap-1 text-[10px] text-muted-foreground">
                  {tpl.supportedLanguages.map((l) => (
                    <span key={l} className="rounded bg-muted px-1.5 py-0.5 border border-border">{l}</span>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => onSelectTemplate(tpl.id)}
                  className="text-xs font-semibold rounded-md gap-1.5"
                >
                  Start Voice Fill <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-2 text-sm font-semibold">No matching form templates</h3>
            <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search query or category filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
