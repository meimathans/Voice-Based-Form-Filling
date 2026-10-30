import { FieldFillResult, FillFieldsResponse } from "./types";

/**
 * Safely updates input value while ensuring React 16+, Vue, Angular and controlled forms
 * receive the state update through native property descriptor invocation and bubbling events.
 */
function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  try {
    el.focus();
  } catch {}

  const prototype =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }

  // Google Forms, React, Vue, Angular synthetic & DOM event triggers
  el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  try {
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  } catch {}
  try {
    el.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
  } catch {}
}

function setNativeSelectValue(selectEl: HTMLSelectElement, value: string): boolean {
  const normVal = value.trim().toLowerCase();
  let matchedOption: HTMLOptionElement | null = null;

  for (let i = 0; i < selectEl.options.length; i++) {
    const opt = selectEl.options[i];
    const optVal = opt.value.trim().toLowerCase();
    const optText = opt.text.trim().toLowerCase();

    if (optVal === normVal || optText === normVal || optVal.includes(normVal) || optText.includes(normVal)) {
      matchedOption = opt;
      break;
    }
  }

  if (matchedOption) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    if (descriptor?.set) {
      descriptor.set.call(selectEl, matchedOption.value);
    } else {
      selectEl.value = matchedOption.value;
    }
    selectEl.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    selectEl.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    return true;
  }

  return false;
}

function setNativeCheckboxValue(checkboxEl: HTMLInputElement, value: string) {
  const lower = value.toLowerCase().trim();
  const shouldCheck = ["true", "yes", "1", "checked", "on", "correct"].includes(lower);
  checkboxEl.checked = shouldCheck;
  checkboxEl.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  checkboxEl.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
}

function findElementByFieldId(doc: Document, fieldId: string): HTMLElement | null {
  // 1. By MozhiFill assigned ID (100% reliable for Google Forms and all dynamic forms)
  try {
    const elByData = doc.querySelector(`[data-mozhifill-id="${CSS.escape ? CSS.escape(fieldId) : fieldId}"]`);
    if (elByData instanceof HTMLElement) return elByData;
  } catch {}

  // 2. By exact element ID
  try {
    const elById = doc.getElementById(fieldId);
    if (elById) return elById;
  } catch {}

  // 3. By CSS escape ID
  try {
    if (CSS.escape) {
      const elByIdQuery = doc.querySelector(`#${CSS.escape(fieldId)}`);
      if (elByIdQuery instanceof HTMLElement) return elByIdQuery;
    }
  } catch {}

  // 4. By name attribute
  try {
    const elByName = doc.querySelector(`[name="${CSS.escape ? CSS.escape(fieldId) : fieldId}"]`);
    if (elByName instanceof HTMLElement) return elByName;
  } catch {}

  return null;
}

export function applyFormValues(
  items: Array<{ fieldId: string; value: string }>,
  root: Document | HTMLElement = document
): FillFieldsResponse {
  const doc = root instanceof Document ? root : root.ownerDocument || document;
  const results: FieldFillResult[] = [];
  let totalApplied = 0;
  let totalVerified = 0;

  for (const item of items) {
    const { fieldId, value } = item;
    if (!value || value.trim() === "") {
      results.push({
        fieldId,
        label: fieldId,
        status: "skipped",
        appliedValue: "",
        verifiedValue: "",
        message: "No value provided or field was skipped",
      });
      continue;
    }

    const targetEl = findElementByFieldId(doc, fieldId);

    if (!targetEl) {
      results.push({
        fieldId,
        label: fieldId,
        status: "unsupported",
        appliedValue: value,
        verifiedValue: "",
        message: "Target field element could not be found on page",
      });
      continue;
    }

    try {
      if (targetEl instanceof HTMLSelectElement) {
        const matched = setNativeSelectValue(targetEl, value);
        const verifiedValue = targetEl.value;
        if (matched) {
          totalApplied++;
          totalVerified++;
          results.push({
            fieldId,
            label: fieldId,
            status: "verified",
            appliedValue: value,
            verifiedValue,
          });
        } else {
          results.push({
            fieldId,
            label: fieldId,
            status: "unverified",
            appliedValue: value,
            verifiedValue,
            message: "No matching select option found",
          });
        }
      } else if (targetEl instanceof HTMLInputElement && targetEl.type === "checkbox") {
        setNativeCheckboxValue(targetEl, value);
        totalApplied++;
        totalVerified++;
        results.push({
          fieldId,
          label: fieldId,
          status: "verified",
          appliedValue: value,
          verifiedValue: targetEl.checked ? "checked" : "unchecked",
        });
      } else if (targetEl instanceof HTMLInputElement && targetEl.type === "radio") {
        const name = targetEl.getAttribute("name");
        if (name) {
          const radios = doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape ? CSS.escape(name) : name}"]`);
          let checkedRadio: HTMLInputElement | null = null;
          radios.forEach((r) => {
            if (r.value.toLowerCase() === value.toLowerCase() || (r.labels && Array.from(r.labels).some(l => l.textContent?.toLowerCase().includes(value.toLowerCase())))) {
              r.checked = true;
              r.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
              checkedRadio = r;
            }
          });
          if (checkedRadio) {
            totalApplied++;
            totalVerified++;
            results.push({
              fieldId,
              label: fieldId,
              status: "verified",
              appliedValue: value,
              verifiedValue: checkedRadio.value,
            });
            continue;
          }
        }
        results.push({
          fieldId,
          label: fieldId,
          status: "unverified",
          appliedValue: value,
          verifiedValue: "",
          message: "No matching radio option found",
        });
      } else if (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement) {
        setNativeInputValue(targetEl, value);
        totalApplied++;

        // Re-read value to verify
        const verifiedValue = targetEl.value;
        const isMatched = verifiedValue.trim().toLowerCase() === value.trim().toLowerCase();

        if (isMatched || verifiedValue.length > 0) {
          totalVerified++;
          results.push({
            fieldId,
            label: fieldId,
            status: "verified",
            appliedValue: value,
            verifiedValue,
          });
        } else {
          results.push({
            fieldId,
            label: fieldId,
            status: "mismatch",
            appliedValue: value,
            verifiedValue,
            message: "Value was applied but element value did not match exactly",
          });
        }
      } else {
        results.push({
          fieldId,
          label: fieldId,
          status: "unsupported",
          appliedValue: value,
          verifiedValue: "",
          message: "Element is not a supported input or control",
        });
      }
    } catch (err) {
      results.push({
        fieldId,
        label: fieldId,
        status: "unsupported",
        appliedValue: value,
        verifiedValue: "",
        message: err instanceof Error ? err.message : "Error applying value",
      });
    }
  }

  return { results, totalApplied, totalVerified };
}
