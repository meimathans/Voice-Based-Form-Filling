import { DetectedField, SupportedFieldType } from "./types";

const SENSITIVE_KEYWORDS = [
  "password",
  "passcode",
  "cvv",
  "cvc",
  "creditcard",
  "cardnumber",
  "card_number",
  "cc-number",
  "cc-csc",
  "cc-cvv",
  "cc-exp",
  "ssn",
  "securitycode",
  "pin",
  "otp",
  "secret",
];

function isSensitiveField(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement && el.type === "password") {
    return true;
  }
  const autocomplete = (el.getAttribute("autocomplete") || "").toLowerCase();
  const name = (el.getAttribute("name") || "").toLowerCase();
  const id = (el.getAttribute("id") || "").toLowerCase();
  const label = (el.getAttribute("aria-label") || "").toLowerCase();
  const parentLabel = (el.closest("label")?.textContent || "").toLowerCase();

  const combined = `${autocomplete} ${name} ${id} ${label} ${parentLabel}`;

  // Postal codes / pincodes are valid form fields and not sensitive credentials
  if (combined.includes("pincode") || combined.includes("postal") || combined.includes("zip")) {
    return false;
  }

  return SENSITIVE_KEYWORDS.some((kw) => {
    if (kw === "pin") {
      return /\b(?:pin|atm[-_]?pin|mpin)\b/.test(combined);
    }
    return combined.includes(kw);
  });
}

function isElementVisible(el: HTMLElement): boolean {
  // If not connected to DOM
  if (!el.isConnected) return false;

  // Basic style checks
  if (el.getAttribute("type") === "hidden") return false;
  if (el.style.display === "none" || el.style.visibility === "hidden" || el.style.opacity === "0") {
    return false;
  }

  // Check computed style if available in browser
  if (typeof window !== "undefined" && window.getComputedStyle) {
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return false;
      }
    } catch {
      // Ignore in mock/test environments
    }
  }

  // offsetParent check (true for normal rendered DOM elements in layout-capable browsers)
  if (
    typeof (el as any).offsetParent !== "undefined" &&
    (el as any).offsetParent === null &&
    el.style.position !== "fixed" &&
    typeof document !== "undefined" &&
    document.body &&
    typeof document.body.getBoundingClientRect === "function" &&
    document.body.getBoundingClientRect().width > 0
  ) {
    return false;
  }

  return true;
}

function isMeaningfulLabel(text: string): boolean {
  if (!text || text.length < 2) return false;
  const lower = text.toLowerCase().trim();
  const generic = [
    "your answer",
    "required question",
    "this is a required question",
    "switch account",
    "not shared",
    "clear form",
    "submit",
    "next",
    "back",
    "untitled field",
  ];
  return !generic.includes(lower);
}

function cleanLabelText(text: string): string {
  return text
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\*+\s*$/, "") // remove trailing asterisks
    .replace(/^\s*\*+\s*/, "") // remove leading asterisks
    .replace(/\s*[:]+\s*$/, "") // remove trailing colon
    .trim();
}

function extractLabel(el: HTMLElement, doc: Document): string {
  // 1. aria-label (if not generic)
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel && isMeaningfulLabel(cleanLabelText(ariaLabel))) {
    return cleanLabelText(ariaLabel);
  }

  // 2. aria-labelledby (handles space-separated ID lists like Google Forms "i1 i4")
  const ariaLabelledBy = el.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const ids = ariaLabelledBy.trim().split(/\s+/);
    const texts = ids
      .map((id) => doc.getElementById(id)?.textContent?.trim())
      .filter((t): t is string => Boolean(t && t.length > 0 && t !== "*"));
    if (texts.length > 0) {
      const combined = cleanLabelText(texts.join(" "));
      if (isMeaningfulLabel(combined)) return combined;
    }
  }

  // 3. Question container search (Google Forms, Microsoft Forms, SurveyMonkey, and modern custom web forms)
  const container = el.closest(
    '[role="listitem"], .Qr7Oae, .geS5n, [data-params], .freebirdFormviewerViewNumberedItemContainer, .form-group, .form-field, fieldset, [data-testid*="question"]'
  );
  if (container) {
    const headingEl = container.querySelector(
      '[role="heading"], .M7eMe, [data-item-title], h1, h2, h3, h4, h5, .question-title, [class*="Title"], [class*="Header"], [class*="label"], strong'
    );
    if (headingEl && headingEl.textContent?.trim()) {
      const headingText = cleanLabelText(headingEl.textContent);
      if (isMeaningfulLabel(headingText)) {
        return headingText;
      }
    }
  }

  // 4. <label for="id">
  const id = el.getAttribute("id");
  if (id) {
    try {
      const labelFor = doc.querySelector(`label[for="${CSS.escape ? CSS.escape(id) : id}"]`);
      if (labelFor && labelFor.textContent?.trim()) {
        const text = cleanLabelText(labelFor.textContent);
        if (isMeaningfulLabel(text)) return text;
      }
    } catch {
      // Fallback if querySelector fails
    }
  }

  // 5. Wrapping <label>
  const parentLabel = el.closest("label");
  if (parentLabel && parentLabel.textContent?.trim()) {
    const text = cleanLabelText(parentLabel.textContent);
    if (isMeaningfulLabel(text)) return text;
  }

  // 6. Direct preceding sibling label
  const prevSibling = el.previousElementSibling;
  if (prevSibling && (prevSibling.tagName === "LABEL" || prevSibling.classList.contains("label") || prevSibling.getAttribute("role") === "heading")) {
    const sibText = cleanLabelText(prevSibling.textContent || "");
    if (isMeaningfulLabel(sibText) && sibText.length < 100) {
      return sibText;
    }
  }

  // 7. Placeholder (if not generic)
  const placeholder = el.getAttribute("placeholder");
  if (placeholder && isMeaningfulLabel(cleanLabelText(placeholder))) {
    return cleanLabelText(placeholder);
  }

  // 8. Title attribute
  const title = el.getAttribute("title");
  if (title && isMeaningfulLabel(cleanLabelText(title))) {
    return cleanLabelText(title);
  }

  // 9. Humanized Name or ID (unless an auto-generated token like entry.123456)
  const name = el.getAttribute("name");
  if (name && !name.startsWith("entry.") && name.trim()) return humanizeFieldName(name);
  if (id && id.trim()) return humanizeFieldName(id);

  return "Untitled Field";
}

function humanizeFieldName(raw: string): string {
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function detectFormFields(root: Document | HTMLElement = document): DetectedField[] {
  const doc = root instanceof Document ? root : root.ownerDocument || document;
  const elements = root.querySelectorAll<HTMLElement>("input, textarea, select");
  const detected: DetectedField[] = [];
  const seenIds = new Set<string>();

  elements.forEach((rawEl, index) => {
    // Filter non-interactive or excluded types
    if (rawEl.getAttribute("disabled") !== null) return;
    if (rawEl.getAttribute("readonly") !== null) return;

    if (rawEl instanceof HTMLInputElement) {
      const inputType = (rawEl.type || "text").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image", "file"].includes(inputType)) {
        return;
      }
    }

    if (isSensitiveField(rawEl)) return;
    if (!isElementVisible(rawEl)) return;

    // Determine type
    let type: SupportedFieldType = "text";
    let options: Array<{ value: string; label: string }> | undefined;

    if (rawEl instanceof HTMLSelectElement) {
      type = "select";
      options = Array.from(rawEl.options).map((opt) => ({
        value: opt.value,
        label: opt.text.trim() || opt.value,
      }));
    } else if (rawEl instanceof HTMLTextAreaElement) {
      type = "textarea";
    } else if (rawEl instanceof HTMLInputElement) {
      const t = rawEl.type.toLowerCase();
      if (t === "email") type = "email";
      else if (t === "tel") type = "tel";
      else if (t === "number") type = "number";
      else if (t === "date") type = "date";
      else if (t === "checkbox") type = "checkbox";
      else if (t === "radio") type = "radio";
      else type = "text";
    }

    // Determine stable field ID
    const rawId = rawEl.getAttribute("id");
    const rawName = rawEl.getAttribute("name");
    let fieldId = rawId || (rawName && !rawName.startsWith("entry.") ? rawName : `field_${index}_${type}`);

    // Disambiguate duplicate IDs if any
    let uniqueId = fieldId;
    let counter = 1;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${fieldId}_${counter++}`;
    }
    seenIds.add(uniqueId);

    // Stamp unique ID on the element in DOM for 100% reliable retrieval during autofill
    try {
      rawEl.setAttribute("data-mozhifill-id", uniqueId);
    } catch {}

    // Current value
    let currentValue = "";
    if (rawEl instanceof HTMLInputElement && (rawEl.type === "checkbox" || rawEl.type === "radio")) {
      currentValue = rawEl.checked ? rawEl.value || "true" : "";
    } else if ("value" in rawEl) {
      currentValue = String((rawEl as any).value || "").trim();
    }

    const label = extractLabel(rawEl, doc);
    const required =
      rawEl.hasAttribute("required") ||
      rawEl.getAttribute("aria-required") === "true" ||
      label.includes("*") ||
      Boolean(rawEl.closest('[role="listitem"], .Qr7Oae')?.querySelector('[aria-label*="required"], .aria-required'));

    const placeholder = rawEl.getAttribute("placeholder") || undefined;

    // Selector
    const selector = rawId
      ? `#${CSS.escape ? CSS.escape(rawId) : rawId}`
      : rawName
      ? `[name="${CSS.escape ? CSS.escape(rawName) : rawName}"]`
      : `${rawEl.tagName.toLowerCase()}:nth-of-type(${index + 1})`;

    detected.push({
      id: uniqueId,
      name: rawName || uniqueId,
      label,
      type,
      required,
      currentValue,
      placeholder,
      options,
      selector,
    });
  });

  return detected;
}
