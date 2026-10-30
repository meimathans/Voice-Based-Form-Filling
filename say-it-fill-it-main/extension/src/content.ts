import { detectFormFields } from "./shared/field-detector";
import { applyFormValues } from "./shared/field-filler";
import { ExtensionMessage, ScanFieldsResponse } from "./shared/types";

// Prevent duplicate injection
if ((window as any).__MOZHIFILL_CONTENT_SCRIPT_INITIALIZED__) {
  // Already initialized
} else {
  (window as any).__MOZHIFILL_CONTENT_SCRIPT_INITIALIZED__ = true;

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "PING") {
      sendResponse({ type: "PONG" });
      return true;
    }

    if (message.type === "SCAN_FIELDS") {
      try {
        const fields = detectFormFields(document);
        const response: ScanFieldsResponse = {
          url: window.location.href,
          pageTitle: document.title || window.location.hostname,
          fields,
          eligible: true,
        };
        sendResponse({ type: "SCAN_FIELDS_RESULT", payload: response });
      } catch (err) {
        sendResponse({
          type: "SCAN_FIELDS_RESULT",
          payload: {
            url: window.location.href,
            pageTitle: document.title,
            fields: [],
            eligible: false,
            message: err instanceof Error ? err.message : "Error scanning form fields",
          },
        });
      }
      return true;
    }

    if (message.type === "FILL_FIELDS") {
      try {
        const result = applyFormValues(message.items, document);
        sendResponse({ type: "FILL_FIELDS_RESULT", payload: result });
      } catch (err) {
        sendResponse({
          type: "FILL_FIELDS_RESULT",
          payload: {
            results: [],
            totalApplied: 0,
            totalVerified: 0,
          },
        });
      }
      return true;
    }

    if (message.type === "HIGHLIGHT_FIELD") {
      try {
        const el = document.getElementById(message.fieldId) || document.querySelector(`[name="${CSS.escape(message.fieldId)}"]`);
        if (el instanceof HTMLElement) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const origOutline = el.style.outline;
          el.style.outline = "2px solid #0D9488";
          el.style.outlineOffset = "2px";
          setTimeout(() => {
            el.style.outline = origOutline;
          }, 2000);
        }
      } catch {}
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });
}
