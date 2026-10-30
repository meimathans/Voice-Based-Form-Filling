import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface WordFormField {
  id: string;
  name: string;
  label: string;
  type: "text" | "multiline" | "checkbox" | "dropdown";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  page?: number;
  originalText?: string;
  currentValue?: string | boolean;
  proposedValue?: string | boolean;
  status: "matched" | "needs_confirmation" | "missing";
  confidence?: number;
  included: boolean;
}

export interface WordFormDocument {
  title: string;
  filename: string;
  rawText: string;
  fields: WordFormField[];
  pdfBytes?: Uint8Array;
}

/**
 * Format string into clean capitalized label
 */
function cleanLabel(raw: string): string {
  let cleaned = raw
    .replace(/^[\d\s.)\-*]+/, "") // remove leading numbering like "1. ", "a) "
    .replace(/[:_.\-–]+$/, "")   // remove trailing colons or dashes
    .replace(/\s+/g, " ")
    .trim();

  // Remove common parenthetical filler like "(in block letters)", "(DD/MM/YYYY)"
  cleaned = cleaned.replace(/\s*\((?:in capital letters|in block letters|as per aadhaar|optional|compulsory|mandatory)\)/gi, "").trim();

  if (!cleaned) return "Form Field";
  return cleaned
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/**
 * Generate a unique slug ID from a label
 */
function toFieldId(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return slug ? `${slug}_${index}` : `field_${index}`;
}

/**
 * Extract structured form fields from hand-filling Word document text
 */
export function extractFieldsFromWordText(rawText: string): { title: string; fields: WordFormField[] } {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let docTitle = "Hand-Filling Application Form";
  if (lines.length > 0) {
    // First line or non-empty line without underscores is usually the document title
    const firstLine = lines[0].replace(/[#*_-]/g, "").trim();
    if (firstLine.length > 3 && !firstLine.includes("___")) {
      docTitle = firstLine;
    }
  }

  const fields: WordFormField[] = [];
  let fieldIndex = 1;

  for (const line of lines) {
    // Check if line contains a field prompt:
    // E.g.: "Candidate Name: ________", "Date of Birth: ________", "Gender: [ ] Male [ ] Female"
    const hasColon = line.includes(":");
    const hasUnderscore = line.includes("___") || line.includes("....") || line.includes("----");
    const hasBrackets = line.includes("[ ]") || line.includes("( )") || line.includes("[X]") || line.includes("[x]");
    const isNumbered = /^\d+[\.\)]\s+[A-Za-z]/.test(line);

    if (hasColon || hasUnderscore || hasBrackets || isNumbered) {
      // Split by colon if present
      let rawLabel = "";
      let remaining = "";

      if (hasColon) {
        const parts = line.split(":");
        rawLabel = parts[0].trim();
        remaining = parts.slice(1).join(":").trim();
      } else if (hasUnderscore) {
        const idx = line.search(/[_.-]{3,}/);
        rawLabel = line.slice(0, idx).trim();
        remaining = line.slice(idx).trim();
      } else {
        rawLabel = line;
      }

      const label = cleanLabel(rawLabel);
      if (label.length < 2 || label.toLowerCase().includes("signature") || label.toLowerCase().includes("date:")) {
        // Skip pure signature lines or dates if trivial, or include as special fields
        if (label.toLowerCase().includes("signature")) continue;
      }

      // Check field type
      let type: WordFormField["type"] = "text";
      let options: string[] | undefined;

      const labelLow = label.toLowerCase();
      const lineLow = line.toLowerCase();

      // Checkbox / multi-choice options detection
      if (hasBrackets || lineLow.includes("[ ]") || lineLow.includes("gender") || lineLow.includes("category")) {
        // Try to parse options after brackets: e.g. "[ ] Male   [ ] Female   [ ] Other"
        const optionMatches = line.match(/(?:\[\s*\]|\(\s*\))\s*([A-Za-z0-9\s/&]+?)(?=(?:\[\s*\]|\(\s*\)|$))/g);
        if (optionMatches && optionMatches.length > 1) {
          options = optionMatches
            .map((m) => m.replace(/^[\[\(\]\)\s]+/, "").trim())
            .filter((o) => o.length > 0 && o.length < 30);
          if (options.length > 1) {
            type = "dropdown";
          }
        }
      }

      // Check single checkbox / declaration
      if (
        labelLow.includes("declaration") ||
        labelLow.includes("agree") ||
        labelLow.includes("consent") ||
        labelLow.includes("scholarship opt") ||
        lineLow.includes("hereby declare") ||
        lineLow.includes("certify that")
      ) {
        type = "checkbox";
      } else if (
        labelLow.includes("address") ||
        labelLow.includes("statement") ||
        labelLow.includes("description") ||
        labelLow.includes("reason")
      ) {
        type = "multiline";
      }

      // If gender didn't catch options
      if (labelLow.includes("gender") && !options) {
        type = "dropdown";
        options = ["Male", "Female", "Other"];
      }

      const id = toFieldId(label, fieldIndex++);
      fields.push({
        id,
        name: id,
        label,
        type,
        options,
        placeholder: `Enter ${label.toLowerCase()}...`,
        required: labelLow.includes("name") || labelLow.includes("phone") || labelLow.includes("dob"),
        originalText: line,
        currentValue: type === "checkbox" ? false : "",
        proposedValue: type === "checkbox" ? false : "",
        status: "missing",
        included: true,
      });
    }
  }

  // If no fields matched (e.g. non-standard text), generate smart default fields from document contents
  if (fields.length === 0) {
    const defaultFields = [
      { label: "Candidate Full Name", type: "text" },
      { label: "Date of Birth", type: "text" },
      { label: "Gender", type: "dropdown", options: ["Male", "Female", "Other"] },
      { label: "Mobile / Phone Number", type: "text" },
      { label: "Email Address", type: "text" },
      { label: "Institution / College", type: "text" },
      { label: "Residential Address", type: "multiline" },
      { label: "Declaration Consent", type: "checkbox" },
    ] as const;

    for (let i = 0; i < defaultFields.length; i++) {
      const def = defaultFields[i];
      const id = toFieldId(def.label, i + 1);
      fields.push({
        id,
        name: id,
        label: def.label,
        type: def.type as any,
        options: (def as any).options,
        placeholder: `Enter ${def.label.toLowerCase()}...`,
        status: "missing",
        included: true,
      });
    }
  }

  return { title: docTitle, fields };
}

/**
 * Parse uploaded Word document (.docx, .doc, or text)
 */
export async function parseWordDocument(
  buffer: ArrayBuffer,
  filename: string
): Promise<WordFormDocument> {
  let rawText = "";

  const isDocx = filename.toLowerCase().endsWith(".docx");

  if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      rawText = result.value || "";
    } catch (err: unknown) {
      console.warn("Mammoth docx parse notice:", err);
      // Fallback: decode text directly
      const decoder = new TextDecoder("utf-8");
      rawText = decoder.decode(buffer);
    }
  } else {
    // Plain text / RTF / HTML fallback
    const decoder = new TextDecoder("utf-8");
    rawText = decoder.decode(buffer);
  }

  const { title, fields } = extractFieldsFromWordText(rawText);

  // Generate interactive fillable PDF from parsed fields
  const pdfBytes = await generateInteractivePdfFromWordFields(title, fields);

  return {
    title,
    filename,
    rawText,
    fields,
    pdfBytes,
  };
}

/**
 * Generate an interactive AcroForm PDF corresponding to the Word document structure
 */
export async function generateInteractivePdfFromWordFields(
  documentTitle: string,
  fields: WordFormField[],
  fieldValues?: Record<string, string | boolean>
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(documentTitle);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.addPage([612, 792]); // Standard US Letter
  const { width, height } = page.getSize();
  const form = doc.getForm();

  // Top header banner
  page.drawRectangle({
    x: 36,
    y: height - 96,
    width: width - 72,
    height: 60,
    fill: rgb(0.06, 0.08, 0.14),
  });

  page.drawText(documentTitle.toUpperCase(), {
    x: 52,
    y: height - 60,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Converted from Word Document Template — Powered by mozhifill Multilingual Engine", {
    x: 52,
    y: height - 80,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.85, 0.85, 0.9),
  });

  let currentY = height - 124;
  page.drawText("HAND-FILLING FORM FIELDS (INTERACTIVE)", {
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
    color: rgb(0.8, 0.8, 0.8),
  });

  currentY -= 30;

  for (const field of fields) {
    if (currentY < 80) break; // Keep within single page or add pages

    // Draw field label
    page.drawText(field.label + ":", {
      x: 36,
      y: currentY + 3,
      size: 9,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    const val = fieldValues ? fieldValues[field.id] ?? field.proposedValue : field.proposedValue;

    if (field.type === "checkbox") {
      const cb = form.createCheckBox(field.id);
      cb.addToPage(page, { x: 190, y: currentY - 3, width: 16, height: 16 });
      const isChecked = val === true || val === "true" || String(val).toLowerCase() === "yes";
      if (isChecked) cb.check();
      page.drawText("(Checked to accept/opt in)", {
        x: 215,
        y: currentY + 1,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      currentY -= 32;
    } else if (field.type === "dropdown" && field.options && field.options.length > 0) {
      const dd = form.createDropdown(field.id);
      dd.addOptions(field.options);
      if (val && field.options.includes(String(val))) {
        dd.select(String(val));
      } else {
        dd.select(field.options[0]);
      }
      dd.addToPage(page, { x: 190, y: currentY - 4, width: 220, height: 21 });
      currentY -= 34;
    } else if (field.type === "multiline") {
      const tf = form.createTextField(field.id);
      tf.enableMultiline();
      if (val) tf.setText(String(val));
      tf.addToPage(page, { x: 190, y: currentY - 20, width: width - 36 - 190, height: 38 });
      currentY -= 50;
    } else {
      // Standard text field
      const tf = form.createTextField(field.id);
      if (val) tf.setText(String(val));
      tf.addToPage(page, { x: 190, y: currentY - 4, width: width - 36 - 190, height: 22 });
      currentY -= 34;
    }
  }

  // Footer
  page.drawText("Zero Data Retention • mozhifill Word-to-PDF Voice Assistant Engine", {
    x: 36,
    y: 36,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await doc.save();
}

/**
 * 3 Built-in Hand-Filling Word Document Presets (formatted exactly like physical Word printable application templates)
 */
export const SAMPLE_WORD_TEMPLATES = [
  {
    id: "univ_admission_docx",
    title: "University Admission & Merit Scholarship Form",
    filename: "University_Admission_HandFill_Form.docx",
    category: "College Admission (Hand-Fill)",
    rawText: `TAMIL NADU STATE UNIVERSITY ADMISSION DOSSIER
Application for Direct Undergraduate / Postgraduate Admission & First-Graduate Scholarship (Hand-Filling Format)

1. Candidate Full Name (in capital letters): __________________________________________________
2. Date of Birth (DD/MM/YYYY): ______________________
3. Gender: [ ] Male   [ ] Female   [ ] Other
4. Mobile / WhatsApp Contact: _______________________
5. Email Address: ___________________________________
6. Preferred College / Campus: ______________________________________________________________
7. Degree Program / Major: __________________________________________________________________
8. Father or Guardian Name: _________________________________________________________________
9. Permanent Residential Address & District: _______________________________________________
10. Community / Scholarship Category: [ ] First Graduate   [ ] Merit   [ ] General
11. Declaration: I certify that the details entered in this form are correct and complete.
    Signature of Candidate: _______________________   Date: ________________________`,
  },
  {
    id: "govt_job_docx",
    title: "Government Public Career & Citizen KYC Form",
    filename: "Government_Career_Registration_Form.docx",
    category: "Public Service KYC",
    rawText: `NATIONAL CAREER SERVICE & CITIZEN EMPLOYMENT DOSSIER
Official Registration Form for Direct Public Recruitment & Verification

1. Applicant Full Name: ____________________________________________________________________
2. National Aadhaar / ID Number: ____________________
3. Date of Birth (YYYY-MM-DD): ______________________
4. Gender: [ ] Male   [ ] Female   [ ] Other
5. Native District / City: ___________________________
6. Highest Educational Qualification: ______________________________________________________
7. Total Experience (in Years): _____________________
8. Complete Residential Address: ___________________________________________________________
9. Declaration: I solemnly declare that all statements made in this application are genuine.`,
  },
  {
    id: "medical_intake_docx",
    title: "Healthcare Outpatient & Consultation Form",
    filename: "Clinical_Patient_Intake_Form.docx",
    category: "Medical Clinic Intake",
    rawText: `METRO CLINICAL HEALTHCARE & CONSULTATION DOSSIER
Confidential Patient Hand-Filling Intake Document

1. Patient Full Name: ______________________________________________________________________
2. Date of Birth: ___________________________________
3. Gender: [ ] Male   [ ] Female   [ ] Other
4. Emergency Contact Number: ________________________
5. Email Address: ___________________________________
6. Primary Address & City: _________________________________________________________________
7. Known Allergies or Existing Conditions: _________________________________________________
8. Consent: I give consent for diagnostic consultation and tele-health record processing.`,
  },
];
