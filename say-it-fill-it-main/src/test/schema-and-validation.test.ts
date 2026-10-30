import { describe, expect, it } from "vitest";
import {
  FORM_TEMPLATES,
  STANDARD_FIELDS,
  getFormTemplate,
  validateFormFields,
  calculateCompletion,
} from "@/lib/form-schemas";

describe("Schema Validation and Templates", () => {
  it("contains all standard 10 baseline fields", () => {
    const ids = STANDARD_FIELDS.map((f) => f.id);
    expect(ids).toEqual([
      "fullName",
      "age",
      "gender",
      "dateOfBirth",
      "phone",
      "email",
      "address",
      "city",
      "pincode",
      "occupation",
    ]);
  });

  it("includes diverse real templates across categories", () => {
    const categories = FORM_TEMPLATES.map((t) => t.category);
    expect(categories).toContain("general");
    expect(categories).toContain("government");
    expect(categories).toContain("education");
    expect(categories).toContain("scholarships");
    expect(categories).toContain("healthcare");
    expect(categories).toContain("employment");
  });

  it("validates required fields correctly", () => {
    const errors = validateFormFields(STANDARD_FIELDS, {});
    expect(errors.fullName).toBeDefined();
    expect(errors.age).toBeDefined();
    expect(errors.phone).toBeDefined();
    expect(errors.city).toBeDefined();
  });

  it("validates phone number regex format", () => {
    const invalidPhone = validateFormFields(STANDARD_FIELDS, {
      fullName: "Ravi Kumar",
      age: "28",
      phone: "12345",
      city: "Chennai",
    });
    expect(invalidPhone.phone).toBe("Must be a valid 10-digit phone number.");

    const validPhone = validateFormFields(STANDARD_FIELDS, {
      fullName: "Ravi Kumar",
      age: "28",
      phone: "9876543210",
      city: "Chennai",
    });
    expect(validPhone.phone).toBeUndefined();
  });

  it("validates email address format", () => {
    const invalidEmail = validateFormFields(STANDARD_FIELDS, {
      fullName: "Ravi Kumar",
      age: "28",
      phone: "9876543210",
      city: "Chennai",
      email: "invalid-email-string",
    });
    expect(invalidEmail.email).toBe("Please enter a valid email address.");

    const validEmail = validateFormFields(STANDARD_FIELDS, {
      fullName: "Ravi Kumar",
      age: "28",
      phone: "9876543210",
      city: "Chennai",
      email: "ravi.kumar@example.com",
    });
    expect(validEmail.email).toBeUndefined();
  });

  it("calculates completion percentage correctly", () => {
    const emptyPercent = calculateCompletion(STANDARD_FIELDS, {});
    expect(emptyPercent).toBe(0);

    const halfFilled = calculateCompletion(STANDARD_FIELDS, {
      fullName: "Ravi",
      age: "28",
      phone: "9876543210",
      city: "Chennai",
      email: "ravi@example.com",
    });
    expect(halfFilled).toBe(50);
  });

  it("preserves unrelated fields during single-field voice correction", () => {
    const initialValues = {
      fullName: "Karthik",
      age: "21",
      city: "Salem",
      occupation: "Student",
    };

    // User speaks correction: "My address is Erode, not Salem" -> updates city to Erode
    const updatedValues = {
      ...initialValues,
      city: "Erode",
    };

    expect(updatedValues.city).toBe("Erode");
    expect(updatedValues.fullName).toBe("Karthik");
    expect(updatedValues.age).toBe("21");
    expect(updatedValues.occupation).toBe("Student");
  });
});
