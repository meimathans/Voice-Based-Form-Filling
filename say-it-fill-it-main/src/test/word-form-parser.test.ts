import { describe, it, expect } from "vitest";
import {
  extractFieldsFromWordText,
  generateInteractivePdfFromWordFields,
  SAMPLE_WORD_TEMPLATES,
} from "../lib/word-form-parser";
import { inspectPdf } from "../lib/pdf-engine";

describe("Word Document Form Parser & PDF Generator", () => {
  it("extracts fields accurately from University Admission hand-filling template", () => {
    const template = SAMPLE_WORD_TEMPLATES[0];
    const { title, fields } = extractFieldsFromWordText(template.rawText);

    expect(title).toContain("UNIVERSITY ADMISSION");
    expect(fields.length).toBeGreaterThan(5);

    // Verify key fields exist
    const labels = fields.map((f) => f.label.toLowerCase());
    expect(labels.some((l) => l.includes("candidate") || l.includes("name"))).toBe(true);
    expect(labels.some((l) => l.includes("date of birth") || l.includes("birth"))).toBe(true);
    expect(labels.some((l) => l.includes("gender"))).toBe(true);
    expect(labels.some((l) => l.includes("mobile") || l.includes("contact"))).toBe(true);

    // Verify gender was detected as dropdown or has options
    const genderField = fields.find((f) => f.label.toLowerCase().includes("gender"));
    expect(genderField).toBeDefined();
    expect(genderField?.type).toBe("dropdown");
    expect(genderField?.options).toContain("Male");
    expect(genderField?.options).toContain("Female");
  });

  it("extracts fields from Government Job KYC template", () => {
    const template = SAMPLE_WORD_TEMPLATES[1];
    const { title, fields } = extractFieldsFromWordText(template.rawText);

    expect(title).toContain("NATIONAL CAREER SERVICE");
    expect(fields.length).toBeGreaterThan(4);

    const labels = fields.map((f) => f.label.toLowerCase());
    expect(labels.some((l) => l.includes("applicant") || l.includes("name"))).toBe(true);
    expect(labels.some((l) => l.includes("aadhaar") || l.includes("id"))).toBe(true);
  });

  it("extracts fields from Medical Intake template", () => {
    const template = SAMPLE_WORD_TEMPLATES[2];
    const { title, fields } = extractFieldsFromWordText(template.rawText);

    expect(title).toContain("METRO CLINICAL");
    expect(fields.length).toBeGreaterThan(4);

    const labels = fields.map((f) => f.label.toLowerCase());
    expect(labels.some((l) => l.includes("patient"))).toBe(true);
  });

  it("generates an interactive AcroForm PDF from Word fields", async () => {
    const template = SAMPLE_WORD_TEMPLATES[0];
    const { title, fields } = extractFieldsFromWordText(template.rawText);

    const pdfBytes = await generateInteractivePdfFromWordFields(title, fields, {
      [fields[0].id]: "Arun Kumar",
    });

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Inspect the generated PDF with pdf-engine
    const inspection = await inspectPdf(pdfBytes);
    expect(inspection.docType).toBe("interactive");
    expect(inspection.fields.length).toBe(fields.length);
  });
});
