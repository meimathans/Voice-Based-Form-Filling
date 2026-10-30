import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  StandardFonts,
  rgb,
} from "pdf-lib";

export type PdfDocumentType = "interactive" | "non_fillable" | "scanned";

export interface PdfField {
  id: string;
  name: string;
  label: string;
  type: "text" | "multiline" | "checkbox" | "radio" | "dropdown";
  options?: string[];
  currentValue: string | boolean;
  proposedValue: string | boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  page: number;
  rect?: { x: number; y: number; width: number; height: number };
  status: "matched" | "needs_confirmation" | "missing";
  confidence?: number;
  explanation?: string;
  included: boolean;
}

export interface PdfInspectionResult {
  docType: PdfDocumentType;
  pageCount: number;
  fields: PdfField[];
  title?: string;
  isEncrypted?: boolean;
  hasSignatures?: boolean;
  warning?: string;
}

/**
 * Clean and format field names into human-readable labels
 */
export function formatFieldLabel(name: string): string {
  // Convert camelCase, snake_case, dot.notation to readable title
  const cleaned = name
    .replace(/[._\-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Form Field";
  return cleaned
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Inspect a PDF byte array and detect fields, pages, and document classification
 */
export async function inspectPdf(pdfBytes: Uint8Array): Promise<PdfInspectionResult> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;

    let form;
    try {
      form = pdfDoc.getForm();
    } catch {
      form = null;
    }

    const rawFields = form ? form.getFields() : [];
    const fields: PdfField[] = [];

    if (rawFields.length > 0) {
      // Document is an interactive AcroForm PDF
      for (let i = 0; i < rawFields.length; i++) {
        const f = rawFields[i];
        const name = f.getName();
        const label = formatFieldLabel(name);

        let type: PdfField["type"] = "text";
        let currentValue: string | boolean = "";
        let options: string[] | undefined;
        let isReadOnly = false;
        let isRequired = false;

        try {
          isReadOnly = f.isReadOnly();
        } catch {}

        try {
          isRequired = f.isRequired();
        } catch {}

        if (f instanceof PDFTextField) {
          type = f.isMultiline() ? "multiline" : "text";
          currentValue = f.getText() || "";
        } else if (f instanceof PDFCheckBox) {
          type = "checkbox";
          currentValue = f.isChecked();
        } else if (f instanceof PDFDropdown) {
          type = "dropdown";
          options = f.getOptions();
          const selected = f.getSelected();
          currentValue = selected.length > 0 ? selected[0] : "";
        } else if (f instanceof PDFRadioGroup) {
          type = "radio";
          options = f.getOptions();
          currentValue = f.getSelected() || "";
        }

        // Estimate page location and widget rect if available
        let pageNum = 1;
        let rect: PdfField["rect"] | undefined;
        try {
          const widgets = f.acroField.getWidgets();
          if (widgets && widgets.length > 0) {
            const w = widgets[0];
            const r = w.getRectangle();
            rect = { x: r.x, y: r.y, width: r.width, height: r.height };

            // Find which page contains this widget
            for (let p = 0; p < pages.length; p++) {
              const pRef = pages[p].ref;
              const wPRef = w.P();
              if (wPRef && wPRef === pRef) {
                pageNum = p + 1;
                break;
              }
            }
          }
        } catch {}

        fields.push({
          id: name,
          name,
          label,
          type,
          options,
          currentValue,
          proposedValue: currentValue,
          isReadOnly,
          isRequired,
          page: pageNum,
          rect,
          status: currentValue ? "matched" : "missing",
          confidence: currentValue ? 0.95 : undefined,
          included: true,
        });
      }

      return {
        docType: "interactive",
        pageCount,
        fields,
        title: pdfDoc.getTitle() || undefined,
      };
    } else {
      // Document has no AcroForm fields.
      // Generate default layout markers for digital/non-fillable form
      const sampleMarkers = generateDefaultNonFillableFields(pages);
      return {
        docType: "non_fillable",
        pageCount,
        fields: sampleMarkers,
        title: pdfDoc.getTitle() || undefined,
        warning:
          "This PDF does not contain interactive AcroForm fields. MozhiFill will use visual text annotations to fill the fields.",
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read PDF document: ${msg}`);
  }
}

/**
 * Generate standard layout fields for non-fillable digital forms
 */
function generateDefaultNonFillableFields(pages: any[]): PdfField[] {
  const fields: PdfField[] = [
    {
      id: "nf_full_name",
      name: "fullName",
      label: "Full Name",
      type: "text",
      currentValue: "",
      proposedValue: "",
      page: 1,
      rect: { x: 140, y: 640, width: 260, height: 20 },
      status: "missing",
      included: true,
    },
    {
      id: "nf_date_of_birth",
      name: "dateOfBirth",
      label: "Date of Birth",
      type: "text",
      currentValue: "",
      proposedValue: "",
      page: 1,
      rect: { x: 140, y: 590, width: 140, height: 20 },
      status: "missing",
      included: true,
    },
    {
      id: "nf_gender",
      name: "gender",
      label: "Gender",
      type: "text",
      currentValue: "",
      proposedValue: "",
      page: 1,
      rect: { x: 380, y: 590, width: 120, height: 20 },
      status: "missing",
      included: true,
    },
    {
      id: "nf_phone",
      name: "phone",
      label: "Phone Number",
      type: "text",
      currentValue: "",
      proposedValue: "",
      page: 1,
      rect: { x: 140, y: 540, width: 160, height: 20 },
      status: "missing",
      included: true,
    },
    {
      id: "nf_email",
      name: "email",
      label: "Email Address",
      type: "text",
      currentValue: "",
      proposedValue: "",
      page: 1,
      rect: { x: 140, y: 490, width: 280, height: 20 },
      status: "missing",
      included: true,
    },
    {
      id: "nf_address",
      name: "address",
      label: "Address",
      type: "multiline",
      currentValue: "",
      proposedValue: "",
      page: 1,
      rect: { x: 140, y: 430, width: 360, height: 40 },
      status: "missing",
      included: true,
    },
    {
      id: "nf_declaration",
      name: "declaration",
      label: "Applicant Declaration",
      type: "checkbox",
      currentValue: false,
      proposedValue: false,
      page: Math.min(pages.length, 1),
      rect: { x: 140, y: 370, width: 16, height: 16 },
      status: "missing",
      included: true,
    },
  ];
  return fields;
}

/**
 * Fill interactive fields or draw annotations on non-fillable PDFs
 */
export async function fillPdf(
  pdfBytes: Uint8Array,
  fieldsToFill: Array<{
    id: string;
    value: string | boolean;
    page?: number;
    rect?: { x: number; y: number; width: number; height: number };
    type?: string;
  }>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  let form;
  try {
    form = pdfDoc.getForm();
  } catch {
    form = null;
  }

  const standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const item of fieldsToFill) {
    if (item.value === undefined || item.value === null || item.value === "") continue;

    let filledAcroField = false;

    if (form) {
      try {
        const field = form.getField(item.id);
        if (field) {
          if (field instanceof PDFTextField) {
            field.setText(String(item.value));
            filledAcroField = true;
          } else if (field instanceof PDFCheckBox) {
            const isChecked =
              item.value === true ||
              item.value === "true" ||
              String(item.value).toLowerCase() === "yes" ||
              String(item.value).toLowerCase() === "checked";
            if (isChecked) {
              field.check();
            } else {
              field.uncheck();
            }
            filledAcroField = true;
          } else if (field instanceof PDFDropdown) {
            const options = field.getOptions();
            const strVal = String(item.value).trim();
            const match = options.find((o) => o.toLowerCase() === strVal.toLowerCase()) || options[0];
            if (match) {
              field.select(match);
              filledAcroField = true;
            }
          } else if (field instanceof PDFRadioGroup) {
            const options = field.getOptions();
            const strVal = String(item.value).trim();
            const match = options.find((o) => o.toLowerCase() === strVal.toLowerCase()) || options[0];
            if (match) {
              field.select(match);
              filledAcroField = true;
            }
          }
        }
      } catch {
        // Field was not an AcroField or threw error, will fall back to visual drawing
      }
    }

    // If not filled as AcroForm, draw visual annotation on page
    if (!filledAcroField && item.rect && item.page && item.page <= pages.length) {
      const page = pages[item.page - 1];
      const isCheckbox =
        item.type === "checkbox" ||
        item.value === true ||
        item.value === false ||
        item.value === "true" ||
        item.value === "false";

      if (isCheckbox) {
        const isChecked =
          item.value === true ||
          item.value === "true" ||
          String(item.value).toLowerCase() === "yes";
        if (isChecked) {
          page.drawText("X", {
            x: item.rect.x + 3,
            y: item.rect.y + 2,
            size: 11,
            font: standardFont,
            color: rgb(0.05, 0.05, 0.05),
          });
        }
      } else {
        const textToDraw = String(item.value);
        page.drawText(textToDraw, {
          x: item.rect.x,
          y: item.rect.y,
          size: 10,
          font: standardFont,
          color: rgb(0.05, 0.05, 0.05),
          maxWidth: item.rect.width || 300,
        });
      }
    }
  }

  return await pdfDoc.save();
}

/**
 * Triggers safe browser download of filled PDF
 */
export function downloadPdf(bytes: Uint8Array, filename = "completed_form.pdf"): void {
  const blob = new Blob([bytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Dynamically creates a professional application document PDF from extracted details
 */
export async function createCustomPdfFromDetails(
  documentTitle: string,
  fields: Array<{ label: string; value: string | boolean }>
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(documentTitle);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const form = doc.getForm();

  // Top modern dark banner
  page.drawRectangle({
    x: 36,
    y: height - 100,
    width: width - 72,
    height: 64,
    fill: rgb(0.06, 0.09, 0.16),
  });

  page.drawText(documentTitle.toUpperCase(), {
    x: 52,
    y: height - 64,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Generated by mozhifill — Multilingual AI Voice & Text Document Engine", {
    x: 52,
    y: height - 84,
    size: 9,
    font: fontRegular,
    color: rgb(0.8, 0.8, 0.85),
  });

  let currentY = height - 130;
  page.drawText("DOCUMENT DETAILS & APPLICANT DATA", {
    x: 36,
    y: currentY,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawLine({
    start: { x: 36, y: currentY - 4 },
    end: { x: width - 36, y: currentY - 4 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  currentY -= 32;

  // Render each field row
  for (const f of fields) {
    if (currentY < 90) break;

    page.drawText(f.label + ":", {
      x: 36,
      y: currentY + 4,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    const isCheckbox =
      f.value === true || f.value === false || f.value === "true" || f.value === "false";
    if (isCheckbox) {
      const cb = form.createCheckBox(`cb_${f.label.replace(/\s+/g, "_")}`);
      cb.addToPage(page, { x: 190, y: currentY - 2, width: 16, height: 16 });
      if (f.value === true || f.value === "true") cb.check();
    } else {
      const tf = form.createTextField(`tf_${f.label.replace(/\s+/g, "_")}`);
      tf.setText(String(f.value || ""));
      tf.addToPage(page, { x: 190, y: currentY - 4, width: width - 36 - 190, height: 22 });
    }

    currentY -= 36;
  }

  // Footer note
  page.drawText("Zero Audio Retention • Verified by mozhifill AI Client Engine", {
    x: 36,
    y: 36,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await doc.save();
}
