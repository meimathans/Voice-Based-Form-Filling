import { useState, useEffect } from "react";
import {
  FileCheck2,
  Trash2,
  ArrowRight,
  Clock,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAllDrafts, deleteDraft, clearAllDrafts, FormDraft } from "@/lib/drafts-storage";

interface DraftsViewProps {
  onResumeDraft: (formId: string, values: Record<string, string>, transcript?: string) => void;
}

export function DraftsView({ onResumeDraft }: DraftsViewProps) {
  const [drafts, setDrafts] = useState<FormDraft[]>([]);

  useEffect(() => {
    setDrafts(loadAllDrafts());
  }, []);

  const handleDelete = (id: string) => {
    deleteDraft(id);
    setDrafts(loadAllDrafts());
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to delete all saved drafts from your local browser storage?")) {
      clearAllDrafts();
      setDrafts([]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
              <FileCheck2 className="mr-1 h-3 w-3" /> Saved Drafts
            </Badge>
            <span className="text-xs text-muted-foreground">• Local Storage</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            My Form Drafts
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Resume incomplete form entries, verify filled fields, or delete drafts. All drafts are stored locally on your device for strict privacy.
          </p>
        </div>

        {drafts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="text-xs text-destructive hover:bg-destructive/10 self-start sm:self-auto gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear All Drafts
          </Button>
        )}
      </div>

      {/* Drafts List */}
      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center bg-card/50">
          <FileCheck2 className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No Saved Drafts</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            When you start filling a form in the Voice Workspace, click "Save Draft" to keep your work in progress.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drafts.map((d) => (
            <Card key={d.id} className="border shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {d.completionPercentage}% Complete
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(d.id)}
                    title="Delete Draft"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardTitle className="text-sm font-bold mt-2 text-foreground truncate">
                  {d.formTitle}
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {new Date(d.updatedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Filled fields:</span>{" "}
                  {Object.keys(d.values).filter((k) => d.values[k]).length} items
                </div>
                <Button
                  onClick={() => onResumeDraft(d.formId, d.values, d.transcript)}
                  size="sm"
                  className="w-full text-xs font-semibold rounded-xl gap-2"
                >
                  Resume In Workspace <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
