import { useState, useEffect } from "react";
import { History, Trash2, Clock, CheckCircle2, Mic, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadActivityHistory, clearActivityHistory, ActivityHistoryItem } from "@/lib/drafts-storage";

export function HistoryView() {
  const [history, setHistory] = useState<ActivityHistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadActivityHistory());
  }, []);

  const handleClear = () => {
    if (confirm("Clear your activity history?")) {
      clearActivityHistory();
      setHistory([]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
              <History className="mr-1 h-3 w-3" /> Activity History
            </Badge>
            <span className="text-xs text-muted-foreground">• Local Audit Trail</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Session History
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Transparent record of your recent voice sessions, saved drafts, and form submissions on this device.
          </p>
        </div>

        {history.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="text-xs text-destructive hover:bg-destructive/10 self-start sm:self-auto gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear History
          </Button>
        )}
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center bg-card/50">
          <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-3 text-base font-semibold text-foreground">No Activity Yet</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Your recording sessions and draft updates will appear here in chronological order.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-4 sm:p-6 shadow-sm divide-y">
          {history.map((item) => (
            <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                  {item.action === "recorded" ? (
                    <Mic className="h-4 w-4" />
                  ) : item.action === "reprocessed" ? (
                    <RefreshCw className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{item.description}</p>
                  <span className="text-[11px] text-muted-foreground">{item.formTitle}</span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
