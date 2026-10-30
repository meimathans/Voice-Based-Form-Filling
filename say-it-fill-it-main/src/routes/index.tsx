import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Navbar, NavTab } from "@/components/Navbar";
import { DashboardView } from "@/components/DashboardView";
import { VoiceFillWorkspace } from "@/components/VoiceFillWorkspace";
import { PdfWorkspaceView } from "@/components/PdfWorkspaceView";
import { FormHubView } from "@/components/FormHubView";
import { FillFromUrlView } from "@/components/FillFromUrlView";
import { DraftsView } from "@/components/DraftsView";
import { HistoryView } from "@/components/HistoryView";
import { LanguageSettingsView } from "@/components/LanguageSettingsView";
import { PrivacyHelpView } from "@/components/PrivacyHelpView";
import { loadLanguageSettings, LanguageSettings, saveLanguageSettings } from "@/lib/languages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mozhifill" },
      {
        name: "description",
        content:
          "Enterprise multilingual voice form assistance platform supporting English, Tamil, and Tanglish with zero audio retention.",
      },
      { property: "og:title", content: "mozhifill" },
      {
        property: "og:description",
        content:
          "Enterprise multilingual voice form assistance platform supporting English, Tamil, and Tanglish with zero audio retention.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeTab, setActiveTab] = useState<NavTab>("workspace");
  const [languageSettings, setLanguageSettings] = useState<LanguageSettings>(loadLanguageSettings);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("standard-general-form");
  const [readBackEnabled, setReadBackEnabled] = useState<boolean>(false);

  useEffect(() => {
    setLanguageSettings(loadLanguageSettings());
  }, []);

  const handleUpdateLanguageSettings = (newSettings: LanguageSettings) => {
    setLanguageSettings(newSettings);
    saveLanguageSettings(newSettings);
  };

  const handleSelectTemplateFromHub = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveTab("workspace");
  };

  const handleResumeDraft = (formId: string) => {
    setSelectedTemplateId(formId);
    setActiveTab("workspace");
  };

  const handleStartUrlAssistance = () => {
    setSelectedTemplateId("standard-general-form");
    setActiveTab("workspace");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors">
      {/* Universal Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        speakingLanguage={languageSettings.speakingLanguage}
        formLanguage={languageSettings.formLanguage}
        readBackEnabled={readBackEnabled}
        onToggleReadBack={() => setReadBackEnabled(!readBackEnabled)}
      />

      {/* Main Content Shell */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        {activeTab === "workspace" && (
          <VoiceFillWorkspace
            initialTemplateId={selectedTemplateId}
            readBackEnabled={readBackEnabled}
          />
        )}

        {activeTab === "pdf" && <PdfWorkspaceView />}

        {activeTab === "dashboard" && (
          <DashboardView
            onStartVoice={(tplId) => {
              if (tplId) setSelectedTemplateId(tplId);
              setActiveTab("workspace");
            }}
            onGoToUrl={() => setActiveTab("url")}
            onGoToHub={() => setActiveTab("hub")}
            onGoToSettings={() => setActiveTab("languages")}
            onGoToPdf={() => setActiveTab("pdf")}
            languageSettings={languageSettings}
          />
        )}

        {activeTab === "hub" && (
          <FormHubView onSelectTemplate={handleSelectTemplateFromHub} />
        )}

        {activeTab === "url" && (
          <FillFromUrlView onStartAssistance={handleStartUrlAssistance} />
        )}

        {activeTab === "drafts" && (
          <DraftsView onResumeDraft={handleResumeDraft} />
        )}

        {activeTab === "history" && <HistoryView />}

        {activeTab === "languages" && (
          <LanguageSettingsView
            settings={languageSettings}
            onUpdateSettings={handleUpdateLanguageSettings}
          />
        )}

        {activeTab === "privacy" && <PrivacyHelpView />}
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t bg-card/60 py-6 text-xs text-muted-foreground mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">mozhifill</span>
            <span>—</span>
            <span>Speak Naturally. Fill Any Form. In Your Language.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab("privacy")}
              className="hover:text-foreground transition underline underline-offset-4"
            >
              Privacy & Retention Policy
            </button>
            <button
              onClick={() => setActiveTab("languages")}
              className="hover:text-foreground transition underline underline-offset-4"
            >
              Language Matrix
            </button>
            <span>v2.0 (Powered by Google Gemini)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
