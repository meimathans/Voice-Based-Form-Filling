export type SupportedFieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "select"
  | "textarea"
  | "checkbox"
  | "radio";

export interface DetectedField {
  id: string;
  name: string;
  label: string;
  type: SupportedFieldType;
  required: boolean;
  currentValue: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  selector: string;
  isSensitive?: boolean;
}

export interface FieldFillProposal {
  fieldId: string;
  label: string;
  type: SupportedFieldType;
  currentValue: string;
  proposedValue: string;
  selected: boolean;
  confidence: "high" | "medium" | "low" | "none";
  requiresClarification?: boolean;
  reasoning?: string;
}

export interface FieldFillResult {
  fieldId: string;
  label: string;
  status: "verified" | "unverified" | "mismatch" | "unsupported" | "skipped";
  appliedValue: string;
  verifiedValue: string;
  message?: string;
}

export interface ScanFieldsResponse {
  url: string;
  pageTitle: string;
  fields: DetectedField[];
  eligible: boolean;
  message?: string;
}

export interface FillFieldsResponse {
  results: FieldFillResult[];
  totalApplied: number;
  totalVerified: number;
}

export type ExtensionMessage =
  | { type: "PING" }
  | { type: "PONG" }
  | { type: "SCAN_FIELDS" }
  | { type: "SCAN_FIELDS_RESULT"; payload: ScanFieldsResponse }
  | { type: "FILL_FIELDS"; items: Array<{ fieldId: string; value: string }> }
  | { type: "FILL_FIELDS_RESULT"; payload: FillFieldsResponse }
  | { type: "HIGHLIGHT_FIELD"; fieldId: string };

export interface ExtensionSettings {
  apiUrl: string;
  speakingLanguage: "english" | "tamil" | "tanglish";
  theme: "light" | "dark";
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  apiUrl: "http://localhost:8080/api/voice-fill",
  speakingLanguage: "english",
  theme: "light",
};
