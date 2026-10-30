import { describe, it, expect } from "vitest";
import { inspectPdf, fillPdf, formatFieldLabel } from "@/lib/pdf-engine";
import {
  createCollegeAdmissionPdf,
  createGovtEmploymentPdf,
  createMedicalIntakePdf,
} from "@/lib/sample-pdf-generator";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown } from "pdf-lib";

describe("PDF Engine & Form Inspection", () => {
  it("formats raw field identifiers into clean human-readable labels", () => {
    expect(formatFieldLabel("applicant_full_name")).toBe("Applicant Full Name");
    expect(formatFieldLabel("dateOfBirth")).toBe("Date Of Birth");
    expect(formatFieldLabel("contact.phone_number")).toBe("Contact Phone Number");
    expect(formatFieldLabel("")).toBe("Form Field");
  });

  it("inspects interactive College Admission PDF and detects all AcroForm fields", async () => {
    const pdfBytes = await createCollegeAdmissionPdf();
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const result = await inspectPdf(pdfBytes);
    expect(result.docType).toBe("interactive");
    expect(result.pageCount).toBe(1);
    expect(result.fields.length).toBe(9);

    // Verify key fields exist
    const fieldNames = result.fields.map((f) => f.name);
    expect(fieldNames).toContain("fullName");
    expect(fieldNames).toContain("dateOfBirth");
    expect(fieldNames).toContain("gender");
    expect(fieldNames).toContain("phone");
    expect(fieldNames).toContain("email");
    expect(fieldNames).toContain("college");
    expect(fieldNames).toContain("degree");
    expect(fieldNames).toContain("scholarshipOpt");

    // Verify field types
    const fullNameField = result.fields.find((f) => f.name === "fullName");
    expect(fullNameField?.type).toBe("text");

    const genderField = result.fields.find((f) => f.name === "gender");
    expect(genderField?.type).toBe("dropdown");
    expect(genderField?.options).toContain("Male");
    expect(genderField?.options).toContain("Female");

    const scholarshipField = result.fields.find((f) => f.name === "scholarshipOpt");
    expect(scholarshipField?.type).toBe("checkbox");
  });

  it("inspects Government Employment & Citizen KYC PDF", async () => {
    const pdfBytes = await createGovtEmploymentPdf();
    const result = await inspectPdf(pdfBytes);

    expect(result.docType).toBe("interactive");
    expect(result.fields.length).toBe(8);

    const names = result.fields.map((f) => f.name);
    expect(names).toContain("applicantName");
    expect(names).toContain("aadhaarNumber");
    expect(names).toContain("district");
    expect(names).toContain("qualification");
    expect(names).toContain("declarationAccepted");
  });

  it("inspects digital non-fillable Medical Intake PDF and classifies it correctly", async () => {
    const pdfBytes = await createMedicalIntakePdf();
    const result = await inspectPdf(pdfBytes);

    expect(result.docType).toBe("non_fillable");
    expect(result.fields.length).toBeGreaterThanOrEqual(5);
    expect(result.warning).toBeDefined();
  });

  it("fills interactive AcroForm fields and reads back verified values", async () => {
    const originalBytes = await createCollegeAdmissionPdf();

    const filledBytes = await fillPdf(originalBytes, [
      { id: "fullName", value: "Arun Kumar" },
      { id: "dateOfBirth", value: "2005-03-15" },
      { id: "phone", value: "9876543210" },
      { id: "email", value: "arun@kongu.edu" },
      { id: "college", value: "Kongu Engineering College" },
      { id: "gender", value: "Male" },
      { id: "degree", value: "B.Tech Artificial Intelligence & Data Science" },
      { id: "scholarshipOpt", value: true },
    ]);

    expect(filledBytes.length).toBeGreaterThan(1000);

    // Verify values written into the PDF
    const reloadedDoc = await PDFDocument.load(filledBytes);
    const form = reloadedDoc.getForm();

    const nameField = form.getTextField("fullName");
    expect(nameField.getText()).toBe("Arun Kumar");

    const dobField = form.getTextField("dateOfBirth");
    expect(dobField.getText()).toBe("2005-03-15");

    const collegeField = form.getTextField("college");
    expect(collegeField.getText()).toBe("Kongu Engineering College");

    const scholarshipField = form.getCheckBox("scholarshipOpt");
    expect(scholarshipField.isChecked()).toBe(true);

    const degreeDropdown = form.getDropdown("degree");
    expect(degreeDropdown.getSelected()).toContain("B.Tech Artificial Intelligence & Data Science");
  });

  it("fills non-fillable PDF with coordinate annotations and generates valid PDF", async () => {
    const originalBytes = await createMedicalIntakePdf();

    const filledBytes = await fillPdf(originalBytes, [
      {
        id: "nf_full_name",
        value: "Priya Sundaram",
        page: 1,
        rect: { x: 140, y: 640, width: 260, height: 20 },
      },
      {
        id: "nf_declaration",
        value: true,
        page: 1,
        rect: { x: 270, y: 370, width: 16, height: 16 },
        type: "checkbox",
      },
    ]);

    expect(filledBytes.length).toBeGreaterThan(1000);
    const reloadedDoc = await PDFDocument.load(filledBytes);
    expect(reloadedDoc.getPages().length).toBe(1);
  });
});
