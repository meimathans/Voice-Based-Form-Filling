export interface FormDraft {
  id: string;
  formId: string;
  formTitle: string;
  updatedAt: string;
  values: Record<string, string>;
  transcript?: string;
  completionPercentage: number;
}

export interface ActivityHistoryItem {
  id: string;
  action: "recorded" | "reprocessed" | "saved_draft" | "submitted" | "cleared";
  description: string;
  timestamp: string;
  formTitle: string;
}

const DRAFTS_KEY = "mozhifill_drafts_v1";
const HISTORY_KEY = "mozhifill_history_v1";

export function loadAllDrafts(): FormDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDraft(draft: FormDraft): void {
  if (typeof window === "undefined") return;
  try {
    const drafts = loadAllDrafts().filter((d) => d.id !== draft.id);
    drafts.unshift(draft);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 20))); // Keep up to 20 drafts
    logActivity({
      action: "saved_draft",
      description: `Draft saved for "${draft.formTitle}" (${draft.completionPercentage}% complete)`,
      formTitle: draft.formTitle,
    });
  } catch (e) {
    console.error("Error saving draft", e);
  }
}

export function deleteDraft(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const drafts = loadAllDrafts().filter((d) => d.id !== id);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error("Error deleting draft", e);
  }
}

export function clearAllDrafts(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFTS_KEY);
}

export function loadActivityHistory(): ActivityHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function logActivity(item: Omit<ActivityHistoryItem, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const history = loadActivityHistory();
    const newItem: ActivityHistoryItem = {
      id: "act_" + Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toISOString(),
      ...item,
    };
    history.unshift(newItem);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 30))); // Keep up to 30 items
  } catch (e) {
    console.error("Error logging activity", e);
  }
}

export function clearActivityHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}
