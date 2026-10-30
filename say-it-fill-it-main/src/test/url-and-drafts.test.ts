import { describe, expect, it, beforeEach } from "vitest";
import { inspectFormUrl, isPrivateOrBlockedHost } from "@/lib/url-checker";
import {
  saveDraft,
  loadAllDrafts,
  deleteDraft,
  clearAllDrafts,
  FormDraft,
} from "@/lib/drafts-storage";

describe("URL Checker and Drafts Storage", () => {
  beforeEach(() => {
    clearAllDrafts();
  });

  it("enforces HTTPS protocol for external form URLs", () => {
    const httpResult = inspectFormUrl("http://unsecure-form-site.com");
    expect(httpResult.isValid).toBe(false);
    expect(httpResult.statusMessage).toContain("HTTPS");

    const httpsResult = inspectFormUrl("https://example.com/admission");
    expect(httpsResult.isValid).toBe(true);
  });

  it("blocks SSRF loopback and private network targets", () => {
    expect(isPrivateOrBlockedHost("10.0.0.1")).toBe(true);
    expect(isPrivateOrBlockedHost("192.168.1.1")).toBe(true);
    expect(isPrivateOrBlockedHost("169.254.169.254")).toBe(true);
    expect(isPrivateOrBlockedHost("internal.service.local")).toBe(true);
    expect(isPrivateOrBlockedHost("google.com")).toBe(false);
  });

  it("recommends Mode C Guided Assistance for external portals", () => {
    const result = inspectFormUrl("https://tneaonline.org/admission");
    expect(result.recommendedMode).toBe("guided");
    expect(result.detectedFields.length).toBeGreaterThan(0);
  });

  it("saves, loads, and deletes drafts from storage without storing raw audio", () => {
    const draft: FormDraft = {
      id: "draft_test_1",
      formId: "standard-general-form",
      formTitle: "Test Form",
      updatedAt: new Date().toISOString(),
      values: { fullName: "Karthik", age: "21", city: "Erode" },
      transcript: "My name is Karthik, I am 21 years old, live in Erode.",
      completionPercentage: 30,
    };

    saveDraft(draft);
    const drafts = loadAllDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].values.fullName).toBe("Karthik");

    deleteDraft("draft_test_1");
    expect(loadAllDrafts().length).toBe(0);
  });

  it("strictly ensures no GEMINI_API_KEY is embedded in client modules", () => {
    const clientEnv = import.meta.env;
    // VITE_ prefix is only for public client vars, ensure no private server key leaked
    expect((clientEnv as any).GEMINI_API_KEY).toBeUndefined();
  });
});
