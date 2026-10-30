import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

export interface SamplePdfOption {
  id: "college_admission" | "govt_employment" | "medical_intake";
  title: string;
  category: "Interactive AcroForm" | "Government KYC" | "Digital Form";
  description: string;
  fieldCount: number;
}

export const SAMPLE_PDFS: SamplePdfOption[] = [
  {
    id: "college_admission",
    title: "College Admission & Merit Scholarship Application",
    category: "Interactive AcroForm",
    description: "Standard university application with interactive student personal, academic, and scholarship fields.",
    fieldCount: 9,
  },
  {
    id: "govt_employment",
    title: "Government Employment & KYC Citizen Registration",
    category: "Government KYC",
    description: "Official public employment registration form with Aadhaar, qualification, and declaration fields.",
    fieldCount: 8,
  },
  {
    id: "medical_intake",
    title: "Healthcare Patient Intake & Clinical Consultation Form",
    category: "Digital Form",
    description: "Digital non-fillable clinic intake document filled using high-precision coordinate text annotations.",
    fieldCount: 7,
  },
];

/**
 * Generate College Admission & Scholarship Application PDF (Interactive AcroForm)
 */
export async function createCollegeAdmissionPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("College Admission & Scholarship Application");
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.addPage([612, 792]); // Standard US Letter
  const { width, height } = page.getSize();
  const form = doc.getForm();

  // Header banner
  page.drawRectangle({
    x: 36,
    y: height - 100,
    width: width - 72,
    height: 64,
    fill: rgb(0.06, 0.09, 0.16),
  });

  page.drawText("TAMIL NADU STATE UNIVERSITY ADMISSION PORTAL", {
    x: 52,
    y: height - 62,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Undergraduate & Postgraduate Direct Admission & First-Graduate Scholarship Form", {
    x: 52,
    y: height - 82,
    size: 9,
    font: fontRegular,
    color: rgb(0.85, 0.85, 0.88),
  });

  // Section 1: Personal Details
  let currentY = height - 130;
  page.drawText("1. APPLICANT PERSONAL INFORMATION", {
    x: 36,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawLine({
    start: { x: 36, y: currentY - 4 },
    end: { x: width - 36, y: currentY - 4 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  currentY -= 35;
  // Field 1: Full Name
  page.drawText("Full Name of Applicant:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const nameField = form.createTextField("fullName");
  nameField.addToPage(page, { x: 170, y: currentY - 4, width: 220, height: 22 });

  // Field 2: Date of Birth
  page.drawText("Date of Birth (YYYY-MM-DD):", { x: 410, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const dobField = form.createTextField("dateOfBirth");
  dobField.addToPage(page, { x: 535, y: currentY - 4, width: width - 36 - 535, height: 22 });

  currentY -= 36;
  // Field 3: Gender
  page.drawText("Gender:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const genderDropdown = form.createDropdown("gender");
  genderDropdown.addOptions(["Male", "Female", "Other"]);
  genderDropdown.select("Male");
  genderDropdown.addToPage(page, { x: 170, y: currentY - 4, width: 120, height: 22 });

  // Field 4: Phone
  page.drawText("Phone Number:", { x: 310, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const phoneField = form.createTextField("phone");
  phoneField.addToPage(page, { x: 400, y: currentY - 4, width: width - 36 - 400, height: 22 });

  currentY -= 36;
  // Field 5: Email Address
  page.drawText("Email Address:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const emailField = form.createTextField("email");
  emailField.addToPage(page, { x: 170, y: currentY - 4, width: width - 36 - 170, height: 22 });

  currentY -= 36;
  // Field 6: Residential Address
  page.drawText("Permanent Address / City:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const addressField = form.createTextField("address");
  addressField.addToPage(page, { x: 170, y: currentY - 4, width: width - 36 - 170, height: 22 });

  // Section 2: Academic Details
  currentY -= 50;
  page.drawText("2. ACADEMIC & INSTITUTION SELECTION", {
    x: 36,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawLine({
    start: { x: 36, y: currentY - 4 },
    end: { x: width - 36, y: currentY - 4 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  currentY -= 35;
  // Field 7: Preferred College / Institution
  page.drawText("College / Institution Name:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const collegeField = form.createTextField("college");
  collegeField.addToPage(page, { x: 170, y: currentY - 4, width: width - 36 - 170, height: 22 });

  currentY -= 36;
  // Field 8: Degree Program
  page.drawText("Degree Program Choice:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const degreeDropdown = form.createDropdown("degree");
  degreeDropdown.addOptions([
    "B.E. Computer Science & Engineering",
    "B.Tech Artificial Intelligence & Data Science",
    "B.Tech Information Technology",
    "B.Com Computer Applications",
    "M.Sc Data Science",
  ]);
  degreeDropdown.select("B.E. Computer Science & Engineering");
  degreeDropdown.addToPage(page, { x: 170, y: currentY - 4, width: 280, height: 22 });

  // Section 3: Scholarship Declaration
  currentY -= 50;
  page.drawText("3. SCHOLARSHIP DECLARATION", {
    x: 36,
    y: currentY,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawLine({
    start: { x: 36, y: currentY - 4 },
    end: { x: width - 36, y: currentY - 4 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  currentY -= 35;
  // Field 9: Scholarship Checkbox
  const scholarshipCheck = form.createCheckBox("scholarshipOpt");
  scholarshipCheck.addToPage(page, { x: 36, y: currentY, width: 16, height: 16 });
  page.drawText(
    "I hereby apply for First-Graduate / Merit Scholarship assistance and confirm the details provided are true.",
    { x: 60, y: currentY + 3, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
  );

  // Footer note
  page.drawText("Powered by mozhifill — Multilingual Voice-Driven Form Assistance Engine", {
    x: 36,
    y: 36,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await doc.save();
}

/**
 * Generate Government Employment & KYC Registration PDF (Interactive AcroForm)
 */
export async function createGovtEmploymentPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Government Employment & Citizen KYC Registration");
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const form = doc.getForm();

  // Header banner
  page.drawRectangle({
    x: 36,
    y: height - 95,
    width: width - 72,
    height: 60,
    fill: rgb(0.08, 0.08, 0.08),
  });

  page.drawText("PUBLIC EMPLOYMENT & CITIZEN KYC REGISTRATION", {
    x: 50,
    y: height - 60,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("National Career Services — Department of Human Resources & Employment", {
    x: 50,
    y: height - 78,
    size: 9,
    font: fontRegular,
    color: rgb(0.8, 0.8, 0.8),
  });

  let currentY = height - 125;
  page.drawText("OFFICIAL APPLICANT DOSSIER", { x: 36, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawLine({ start: { x: 36, y: currentY - 4 }, end: { x: width - 36, y: currentY - 4 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

  currentY -= 35;
  // Field 1: applicantName
  page.drawText("Full Name:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const nameField = form.createTextField("applicantName");
  nameField.addToPage(page, { x: 140, y: currentY - 4, width: 220, height: 22 });

  // Field 2: dob
  page.drawText("DOB:", { x: 380, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const dobField = form.createTextField("dob");
  dobField.addToPage(page, { x: 430, y: currentY - 4, width: width - 36 - 430, height: 22 });

  currentY -= 36;
  // Field 3: gender
  page.drawText("Gender:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const genderDropdown = form.createDropdown("gender");
  genderDropdown.addOptions(["Male", "Female", "Other"]);
  genderDropdown.select("Male");
  genderDropdown.addToPage(page, { x: 140, y: currentY - 4, width: 120, height: 22 });

  // Field 4: aadhaarNumber
  page.drawText("National ID / Aadhaar:", { x: 280, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const aadhaarField = form.createTextField("aadhaarNumber");
  aadhaarField.addToPage(page, { x: 410, y: currentY - 4, width: width - 36 - 410, height: 22 });

  currentY -= 36;
  // Field 5: district
  page.drawText("District / City:", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const districtField = form.createTextField("district");
  districtField.addToPage(page, { x: 140, y: currentY - 4, width: 200, height: 22 });

  // Field 6: qualification
  page.drawText("Qualification:", { x: 360, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const qualField = form.createTextField("qualification");
  qualField.addToPage(page, { x: 440, y: currentY - 4, width: width - 36 - 440, height: 22 });

  currentY -= 36;
  // Field 7: experienceYears
  page.drawText("Experience (Years):", { x: 36, y: currentY + 4, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  const expField = form.createTextField("experienceYears");
  expField.addToPage(page, { x: 140, y: currentY - 4, width: 100, height: 22 });

  currentY -= 40;
  // Field 8: declarationAccepted
  const decCheck = form.createCheckBox("declarationAccepted");
  decCheck.addToPage(page, { x: 36, y: currentY, width: 16, height: 16 });
  page.drawText(
    "I certify that the information entered above is genuine and verified according to public guidelines.",
    { x: 60, y: currentY + 3, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
  );

  return await doc.save();
}

/**
 * Generate Healthcare Patient Intake PDF (Digital Non-fillable Form)
 */
export async function createMedicalIntakePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Healthcare Patient Intake Form");
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();

  // Header
  page.drawRectangle({
    x: 36,
    y: height - 90,
    width: width - 72,
    height: 54,
    fill: rgb(0.12, 0.12, 0.14),
  });

  page.drawText("METRO HEALTHCARE & CLINICAL CONSULTATION INTAKE", {
    x: 52,
    y: height - 58,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Confidential Outpatient Digital Registration Record", {
    x: 52,
    y: height - 76,
    size: 9,
    font: fontRegular,
    color: rgb(0.85, 0.85, 0.85),
  });

  let currentY = height - 120;

  // Labeled boxes simulating a printed/scanned form
  const rows = [
    { label: "Full Name:", id: "nf_full_name", y: 640 },
    { label: "Date of Birth (YYYY-MM-DD):", id: "nf_date_of_birth", y: 590 },
    { label: "Gender:", id: "nf_gender", y: 590, x: 330 },
    { label: "Phone Number:", id: "nf_phone", y: 540 },
    { label: "Email Address:", id: "nf_email", y: 490 },
    { label: "Primary Address & City:", id: "nf_address", y: 430 },
  ];

  for (const r of rows) {
    const rx = (r as any).x || 36;
    page.drawText(r.label, { x: rx, y: r.y + 4, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    // Outline box for entry
    const boxX = rx === 36 ? 140 : 380;
    const boxWidth = rx === 36 ? 180 : 120;
    page.drawRectangle({
      x: boxX,
      y: r.y - 2,
      width: boxWidth,
      height: 20,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });
  }

  // Declaration checkbox box
  page.drawText("Consent for Tele-consultation & Records Sharing:", {
    x: 36,
    y: 374,
    size: 9,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawRectangle({
    x: 270,
    y: 370,
    width: 16,
    height: 16,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });

  return await doc.save();
}

/**
 * Load or generate selected sample PDF
 */
export async function getSamplePdfBytes(
  sampleId: "college_admission" | "govt_employment" | "medical_intake"
): Promise<{ filename: string; bytes: Uint8Array; title: string }> {
  switch (sampleId) {
    case "college_admission":
      return {
        filename: "college_admission_form.pdf",
        bytes: await createCollegeAdmissionPdf(),
        title: "College Admission & Merit Scholarship Application",
      };
    case "govt_employment":
      return {
        filename: "govt_employment_registration.pdf",
        bytes: await createGovtEmploymentPdf(),
        title: "Government Employment & Citizen KYC Registration",
      };
    case "medical_intake":
      return {
        filename: "healthcare_patient_intake.pdf",
        bytes: await createMedicalIntakePdf(),
        title: "Healthcare Patient Intake & Clinical Consultation Form",
      };
  }
}
