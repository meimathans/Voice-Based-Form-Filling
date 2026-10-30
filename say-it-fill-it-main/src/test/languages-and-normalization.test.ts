import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE_SETTINGS,
  normalizeTanglishInput,
  TANGLISH_NORMALIZATION_MAP,
} from "@/lib/languages";

describe("Languages and Tanglish Normalization", () => {
  it("includes Tamil, Indian English, Tanglish, and regional languages", () => {
    const ids = SUPPORTED_LANGUAGES.map((l) => l.id);
    expect(ids).toContain("tamil");
    expect(ids).toContain("english");
    expect(ids).toContain("tanglish");
    expect(ids).toContain("hindi");
    expect(ids).toContain("telugu");
  });

  it("preserves Tamil Unicode text correctly without corruption", () => {
    const tamilSample = "என் பெயர் ரவி குமார், எனக்கு 28 வயது, நான் சென்னையில் இருக்கிறேன்.";
    expect(tamilSample).toMatch(/[\u0B80-\u0BFF]/);
    const normalized = normalizeTanglishInput(tamilSample);
    expect(normalized).toBe(tamilSample);
  });

  it("normalizes spoken numbers and email tokens in Tanglish", () => {
    const input = "my phone is nine eight seven six five four three two one zero and email is test at gmail dot com";
    const result = normalizeTanglishInput(input);
    expect(result).toContain("9");
    expect(result).toContain("8");
    expect(result).toContain("7");
    expect(result).toContain("@");
    expect(result).toContain(".");
  });

  it("maps Tanglish semantic tokens to correct form field keys", () => {
    expect(TANGLISH_NORMALIZATION_MAP["peru"]).toBe("fullName");
    expect(TANGLISH_NORMALIZATION_MAP["peyar"]).toBe("fullName");
    expect(TANGLISH_NORMALIZATION_MAP["vayasu"]).toBe("age");
    expect(TANGLISH_NORMALIZATION_MAP["oor"]).toBe("city");
    expect(TANGLISH_NORMALIZATION_MAP["velai"]).toBe("occupation");
    expect(TANGLISH_NORMALIZATION_MAP["aan"]).toBe("Male");
    expect(TANGLISH_NORMALIZATION_MAP["pen"]).toBe("Female");
  });

  it("has independent 4-tier language settings default structure", () => {
    expect(DEFAULT_LANGUAGE_SETTINGS).toHaveProperty("speakingLanguage");
    expect(DEFAULT_LANGUAGE_SETTINGS).toHaveProperty("formLanguage");
    expect(DEFAULT_LANGUAGE_SETTINGS).toHaveProperty("interfaceLanguage");
    expect(DEFAULT_LANGUAGE_SETTINGS).toHaveProperty("assistantLanguage");
  });

  it("normalizes dateOfBirth, gender, phone, pincode, age properly", async () => {
    const { normalizeFieldValue } = await import("@/routes/api/voice-fill");
    expect(normalizeFieldValue("gender", "male")).toBe("Male");
    expect(normalizeFieldValue("gender", "pen")).toBe("Female");
    expect(normalizeFieldValue("gender", "ஆண்")).toBe("Male");
    expect(normalizeFieldValue("gender", "பெண்")).toBe("Female");

    expect(normalizeFieldValue("dateOfBirth", "15/08/1995")).toBe("1995-08-15");
    expect(normalizeFieldValue("dateOfBirth", "15-08-1995")).toBe("1995-08-15");
    expect(normalizeFieldValue("dateOfBirth", "1995-08-15")).toBe("1995-08-15");

    expect(normalizeFieldValue("age", "28 years old")).toBe("28");
    expect(normalizeFieldValue("phone", "+91 98765-43210")).toBe("9876543210");
    expect(normalizeFieldValue("pincode", "PIN 600 028")).toBe("600028");
    expect(normalizeFieldValue("email", "Test.User@Gmail.Com")).toBe("test.user@gmail.com");
  });
});
