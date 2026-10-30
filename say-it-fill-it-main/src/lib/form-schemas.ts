export type FieldType = "text" | "number" | "date" | "email" | "tel" | "select" | "textarea";

export interface FormFieldSchema {
  id: string;
  label: string;
  labelTa?: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helpText?: string;
  wide?: boolean;
  validationRegex?: string;
  privacyClassification?: "public" | "pii" | "sensitive";
}

export interface FormTemplate {
  id: string;
  title: string;
  titleTa?: string;
  description: string;
  descriptionTa?: string;
  category: "government" | "education" | "scholarships" | "employment" | "healthcare" | "general" | "custom";
  status: "verified" | "demo" | "user-created";
  supportedLanguages: string[];
  referenceUrl?: string;
  disclaimer?: string;
  fields: FormFieldSchema[];
}

export const CATEGORIES = [
  { id: "all", label: "All Categories", icon: "Grid" },
  { id: "general", label: "General Applications", icon: "FileText" },
  { id: "government", label: "Government Services", icon: "Building2" },
  { id: "education", label: "College & University", icon: "GraduationCap" },
  { id: "scholarships", label: "Scholarships & Aid", icon: "Award" },
  { id: "employment", label: "Employment & Jobs", icon: "Briefcase" },
  { id: "healthcare", label: "Healthcare Intake", icon: "HeartPulse" },
  { id: "custom", label: "Custom Forms", icon: "Settings2" },
] as const;

/**
 * Baseline 10 Standard Fields ensuring backward compatibility with existing tests and schema.
 */
export const STANDARD_FIELDS: FormFieldSchema[] = [
  { id: "fullName", label: "Full name", labelTa: "முழு பெயர்", type: "text", required: true, wide: true, placeholder: "e.g. Ravi Kumar", helpText: "Your legal full name" },
  { id: "age", label: "Age", labelTa: "வயது", type: "number", required: true, placeholder: "e.g. 28", helpText: "Age in completed years" },
  {
    id: "gender",
    label: "Gender",
    labelTa: "பாலினம்",
    type: "select",
    required: true,
    options: [
      { value: "Male", label: "Male" },
      { value: "Female", label: "Female" },
      { value: "Other", label: "Other" },
    ],
  },
  { id: "dateOfBirth", label: "Date of birth", labelTa: "பிறந்த தேதி", type: "date", placeholder: "YYYY-MM-DD" },
  { id: "phone", label: "Phone", labelTa: "தொலைபேசி எண்", type: "tel", required: true, placeholder: "10-digit number", validationRegex: "^[0-9]{10}$" },
  { id: "email", label: "Email", labelTa: "மின்னஞ்சல்", type: "email", wide: true, placeholder: "name@domain.com" },
  { id: "address", label: "Address", labelTa: "முகவரி", type: "textarea", wide: true, placeholder: "Door No, Street, Locality" },
  { id: "city", label: "City", labelTa: "ஊர் / நகரம்", type: "text", required: true, placeholder: "e.g. Chennai" },
  { id: "pincode", label: "Pincode", labelTa: "அஞ்சல் குறியீடு", type: "text", placeholder: "6-digit PIN code", validationRegex: "^[0-9]{6}$" },
  { id: "occupation", label: "Occupation", labelTa: "தொழில்", type: "text", wide: true, placeholder: "e.g. Software Engineer" },
];

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "standard-general-form",
    title: "Standard Personal Details Form",
    titleTa: "நிலையான தனிப்பட்ட விவரங்கள் படிவம்",
    description: "Universal personal intake form with full name, contact, address, age, and occupation.",
    descriptionTa: "பெயர், தொடர்பு, முகவரி, வயது மற்றும் தொழில் கொண்ட பொதுவான படிவம்.",
    category: "general",
    status: "verified",
    supportedLanguages: ["English", "தமிழ்", "Tanglish"],
    fields: STANDARD_FIELDS,
  },
  {
    id: "govt-pds-service",
    title: "Citizen Civil Supplies & Welfare Intake",
    titleTa: "குடிமக்கள் உணவு மற்றும் நுகர்வோர் சேவை",
    description: "Demo template modeled after public service citizen verification. Not an official filing portal.",
    descriptionTa: "அரசு உணவுப் பொருள் வழங்கல் மாதிரி படிவம்.",
    category: "government",
    status: "demo",
    referenceUrl: "https://www.tnpds.gov.in/",
    disclaimer: "Reference demo template for voice testing. This tool does NOT directly transmit or submit data to government servers.",
    supportedLanguages: ["English", "தமிழ்", "Tanglish"],
    fields: [
      { id: "fullName", label: "Head of Family Name", labelTa: "குடும்பத் தலைவர் பெயர்", type: "text", required: true, wide: true },
      { id: "age", label: "Age", labelTa: "வயது", type: "number", required: true },
      {
        id: "gender",
        label: "Gender",
        labelTa: "பாலினம்",
        type: "select",
        required: true,
        options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }],
      },
      { id: "phone", label: "Registered Mobile Number", labelTa: "பதிவுசெய்யப்பட்ட கைபேசி எண்", type: "tel", required: true, validationRegex: "^[0-9]{10}$" },
      { id: "address", label: "Residential Door & Street", labelTa: "குடியிருப்பு முகவரி", type: "textarea", wide: true, required: true },
      { id: "city", label: "Taluk / Town", labelTa: "வட்டம் / ஊர்", type: "text", required: true },
      { id: "pincode", label: "Pincode", labelTa: "அஞ்சல் குறியீடு", type: "text", required: true, validationRegex: "^[0-9]{6}$" },
      { id: "occupation", label: "Livelihood / Occupation", labelTa: "தொழில்", type: "text", wide: true },
    ],
  },
  {
    id: "college-admission-intake",
    title: "College & Higher Education Admission Intake",
    titleTa: "கல்லூரி சேர்க்கை விண்ணப்பப் படிவம்",
    description: "Standard undergraduate admission registration form for universities and colleges.",
    category: "education",
    status: "demo",
    supportedLanguages: ["English", "தமிழ்", "Tanglish"],
    fields: [
      { id: "fullName", label: "Candidate Name", labelTa: "விண்ணப்பதாரர் பெயர்", type: "text", required: true, wide: true },
      { id: "dateOfBirth", label: "Date of Birth", labelTa: "பிறந்த தேதி", type: "date", required: true },
      { id: "gender", label: "Gender", labelTa: "பாலினம்", type: "select", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }] },
      { id: "email", label: "Applicant Email", labelTa: "மின்னஞ்சல்", type: "email", required: true, wide: true },
      { id: "phone", label: "Student Contact Phone", labelTa: "கைபேசி எண்", type: "tel", required: true },
      { id: "city", label: "Native District / City", labelTa: "சொந்த ஊர்", type: "text", required: true },
      { id: "pincode", label: "Postal Pincode", labelTa: "அஞ்சல் குறியீடு", type: "text" },
      { id: "occupation", label: "Parent / Guardian Occupation", labelTa: "பெற்றோர் தொழில்", type: "text", wide: true },
    ],
  },
  {
    id: "scholarship-merit-intake",
    title: "State Merit & Post-Matric Scholarship",
    titleTa: "கல்வி உதவித்தொகை விண்ணப்பம்",
    description: "Educational financial assistance and scholarship candidate application demo.",
    category: "scholarships",
    status: "demo",
    supportedLanguages: ["English", "தமிழ்", "Tanglish"],
    fields: [
      { id: "fullName", label: "Scholar Applicant Name", labelTa: "மாணவர் பெயர்", type: "text", required: true, wide: true },
      { id: "age", label: "Age", labelTa: "வயது", type: "number", required: true },
      { id: "phone", label: "Primary Phone Number", labelTa: "கைபேசி எண்", type: "tel", required: true },
      { id: "email", label: "Communication Email", labelTa: "மின்னஞ்சல்", type: "email", wide: true },
      { id: "city", label: "Home Town / City", labelTa: "ஊர்", type: "text", required: true },
      { id: "pincode", label: "Pincode", labelTa: "அஞ்சல் குறியீடு", type: "text" },
      { id: "occupation", label: "Annual Household Livelihood", labelTa: "குடும்ப வாழ்வாதாரம்", type: "text", wide: true },
    ],
  },
  {
    id: "healthcare-patient-intake",
    title: "Healthcare Clinic & Outpatient Intake",
    titleTa: "மருத்துவமனை வெளிநோயாளி பதிவு படிவம்",
    description: "Basic clinical registration for outpatient appointments and health records.",
    category: "healthcare",
    status: "demo",
    supportedLanguages: ["English", "தமிழ்", "Tanglish"],
    fields: [
      { id: "fullName", label: "Patient Full Name", labelTa: "நோயாளி பெயர்", type: "text", required: true, wide: true },
      { id: "age", label: "Patient Age", labelTa: "வயது", type: "number", required: true },
      { id: "gender", label: "Gender", labelTa: "பாலினம்", type: "select", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }] },
      { id: "phone", label: "Emergency Contact Phone", labelTa: "அவசர தொடர்பு எண்", type: "tel", required: true },
      { id: "address", label: "Residential Locality", labelTa: "வசிப்பிட முகவரி", type: "textarea", wide: true },
      { id: "city", label: "City", labelTa: "ஊர்", type: "text", required: true },
    ],
  },
  {
    id: "employment-job-intake",
    title: "Employment & Career Application",
    titleTa: "வேலைவாய்ப்பு விண்ணப்பப் படிவம்",
    description: "Job seeker application for professional and technical roles.",
    category: "employment",
    status: "demo",
    supportedLanguages: ["English", "தமிழ்", "Tanglish"],
    fields: [
      { id: "fullName", label: "Candidate Name", labelTa: "விண்ணப்பதாரர் பெயர்", type: "text", required: true, wide: true },
      { id: "email", label: "Work / Personal Email", labelTa: "மின்னஞ்சல்", type: "email", required: true, wide: true },
      { id: "phone", label: "Direct Contact Phone", labelTa: "தொலைபேசி எண்", type: "tel", required: true },
      { id: "city", label: "Current Location", labelTa: "தற்போதைய ஊர்", type: "text", required: true },
      { id: "occupation", label: "Target Role / Profession", labelTa: "விருப்பமான பணி", type: "text", required: true, wide: true },
    ],
  },
];

/**
 * Finds a template by its ID, defaulting to the standard general form.
 */
export function getFormTemplate(id?: string): FormTemplate {
  if (!id) return FORM_TEMPLATES[0];
  const found = FORM_TEMPLATES.find((t) => t.id === id);
  return found || FORM_TEMPLATES[0];
}

/**
 * Computes field validation and returns an error map.
 */
export function validateFormFields(
  fields: FormFieldSchema[],
  values: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const val = (values[f.id] || "").trim();

    if (f.required && !val) {
      errors[f.id] = `${f.label} is required.`;
      continue;
    }

    if (val) {
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        errors[f.id] = "Please enter a valid email address.";
      } else if (f.type === "tel" && f.validationRegex && !new RegExp(f.validationRegex).test(val.replace(/\s+/g, ""))) {
        errors[f.id] = "Must be a valid 10-digit phone number.";
      } else if (f.id === "pincode" && f.validationRegex && !new RegExp(f.validationRegex).test(val)) {
        errors[f.id] = "Must be a valid 6-digit postal code.";
      } else if (f.type === "number" && isNaN(Number(val))) {
        errors[f.id] = "Please enter a valid number.";
      }
    }
  }

  return errors;
}

/**
 * Calculates form completion percentage.
 */
export function calculateCompletion(fields: FormFieldSchema[], values: Record<string, string>): number {
  if (!fields.length) return 0;
  let filled = 0;
  for (const f of fields) {
    if (values[f.id] && values[f.id].trim().length > 0) {
      filled++;
    }
  }
  return Math.round((filled / fields.length) * 100);
}
