import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardView } from "@/components/DashboardView";
import { FormHubView } from "@/components/FormHubView";
import { FillFromUrlView } from "@/components/FillFromUrlView";
import { DEFAULT_LANGUAGE_SETTINGS } from "@/lib/languages";

describe("Platform Features and Navigation UI", () => {
  it("renders Dashboard with welcome hero, CTAs, and walkthrough", () => {
    let startedVoice = false;
    let wentToUrl = false;

    render(
      <DashboardView
        onStartVoice={() => { startedVoice = true; }}
        onGoToUrl={() => { wentToUrl = true; }}
        onGoToHub={() => {}}
        onGoToSettings={() => {}}
        languageSettings={DEFAULT_LANGUAGE_SETTINGS}
      />
    );

    expect(screen.getAllByText(/Speak Naturally/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Start with Voice")).toBeDefined();
    expect(screen.getByText("Paste Form URL")).toBeDefined();
    expect(screen.getByText("Stage A: Speak Naturally")).toBeDefined();
    expect(screen.getByText("Stage B: Understand & Verify")).toBeDefined();
    expect(screen.getByText("Stage C: Review & Fill")).toBeDefined();

    fireEvent.click(screen.getByText("Start with Voice"));
    expect(startedVoice).toBe(true);

    fireEvent.click(screen.getByText("Paste Form URL"));
    expect(wentToUrl).toBe(true);
  });

  it("renders Form Hub with categories and templates", () => {
    let selectedId = "";
    render(
      <FormHubView
        onSelectTemplate={(id) => { selectedId = id; }}
      />
    );

    expect(screen.getByText("Explore Form Templates")).toBeDefined();
    expect(screen.getByText("Government Services")).toBeDefined();
    expect(screen.getByText("College & University")).toBeDefined();
    expect(screen.getAllByText("Start Voice Fill").length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getAllByText("Start Voice Fill")[0]);
    expect(selectedId).not.toBe("");
  });

  it("renders Fill From URL view with HTTPS inspection", () => {
    let startedAssistance = false;
    render(
      <FillFromUrlView
        onStartAssistance={() => { startedAssistance = true; }}
      />
    );

    expect(screen.getByText("Assisted External Form Filling")).toBeDefined();
    expect(screen.getByText("Inspect Compatibility")).toBeDefined();
    expect(screen.getByText("Start Guided Voice Fill")).toBeDefined();

    fireEvent.click(screen.getByText("Start Guided Voice Fill"));
    expect(startedAssistance).toBe(true);
  });
});
