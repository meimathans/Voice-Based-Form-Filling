import React, { useState, useEffect, useRef } from "react";
import {
  DetectedField,
  FieldFillProposal,
  FieldFillResult,
  ExtensionSettings,
  DEFAULT_SETTINGS,
  ScanFieldsResponse,
  FillFieldsResponse,
} from "../shared/types";
import { extractFieldsWithBackend, extractFieldsWithAudio } from "../shared/api-client";
import { recordWav } from "../shared/record-wav";

export function PopupApp() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [pageInfo, setPageInfo] = useState<{ url: string; title: string } | null>(null);
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([]);
  const [proposals, setProposals] = useState<FieldFillProposal[]>([]);
  const [results, setResults] = useState<FieldFillResult[] | null>(null);

  const [language, setLanguage] = useState<"english" | "tamil" | "tanglish">("english");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [activeMode, setActiveMode] = useState<"web" | "pdf">("web");
  const [isPdfTab, setIsPdfTab] = useState(false);

  const recorderRef = useRef<{ stop: () => Promise<File> } | null>(null);

  // Load settings and scan active tab on mount
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(["apiUrl", "speakingLanguage", "theme"], (res) => {
        if (res.apiUrl) setSettings((prev) => ({ ...prev, apiUrl: res.apiUrl }));
        if (res.speakingLanguage) {
          setSettings((prev) => ({ ...prev, speakingLanguage: res.speakingLanguage }));
          setLanguage(res.speakingLanguage);
        }
      });
    }

    scanActiveTab();
  }, []);

  const openPermissionTab = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.runtime) {
      chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
    } else {
      window.open("permission.html", "_blank");
    }
  };

  const openPdfWorkspace = () => {
    const targetUrl = "http://localhost:8080/";
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, "_blank");
    }
  };

  const scanActiveTab = async () => {
    setErrorMessage("");
    setStatusMessage("Scanning webpage for form fields...");

    if (typeof chrome === "undefined" || !chrome.tabs) {
      // Mock environment (for dev or preview)
      setPageInfo({ url: "https://example.com/apply", title: "Job Application Form" });
      const mockFields: DetectedField[] = [
        { id: "full_name", name: "full_name", label: "Full Name", type: "text", required: true, currentValue: "", selector: "#full_name" },
        { id: "email", name: "email", label: "Email Address", type: "email", required: true, currentValue: "", selector: "#email" },
        { id: "phone", name: "phone", label: "Mobile Phone", type: "tel", required: false, currentValue: "", selector: "#phone" },
        { id: "city", name: "city", label: "City / Location", type: "text", required: false, currentValue: "", selector: "#city" },
      ];
      setDetectedFields(mockFields);
      setStatusMessage("");
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        setErrorMessage("No active webpage found.");
        setStatusMessage("");
        return;
      }

      // Check if URL is a PDF document
      const url = tab.url || "";
      const isPdf =
        url.toLowerCase().endsWith(".pdf") ||
        url.toLowerCase().includes(".pdf?") ||
        url.toLowerCase().includes("/pdf/") ||
        Boolean(tab.title && tab.title.toLowerCase().endsWith(".pdf"));

      if (isPdf) {
        setIsPdfTab(true);
        setActiveMode("pdf");
        setPageInfo({ url, title: tab.title || "PDF Document" });
        setStatusMessage("");
        return;
      }

      // Check if URL is restricted (chrome://, edge://, about:)
      if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:") || url.startsWith("chrome-extension://")) {
        setErrorMessage("MozhiFill AI cannot run on browser internal pages. Please visit a website with a form.");
        setStatusMessage("");
        return;
      }

      setPageInfo({ url, title: tab.title || "Active Webpage" });

      // Send message to content script
      chrome.tabs.sendMessage(tab.id, { type: "SCAN_FIELDS" }, (response: any) => {
        if (chrome.runtime.lastError || !response || !response.payload) {
          // Attempt script injection if content script wasn't loaded
          chrome.scripting.executeScript(
            {
              target: { tabId: tab.id! },
              files: ["content.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                setErrorMessage("Unable to access page. Please check site permissions or refresh the tab.");
                setStatusMessage("");
              } else {
                // Retry scan after injection
                chrome.tabs.sendMessage(tab.id!, { type: "SCAN_FIELDS" }, (retryRes: any) => {
                  if (retryRes?.payload) {
                    handleScanResult(retryRes.payload);
                  } else {
                    setErrorMessage("No supported form fields detected on this page.");
                    setStatusMessage("");
                  }
                });
              }
            }
          );
        } else {
          handleScanResult(response.payload);
        }
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error scanning webpage");
      setStatusMessage("");
    }
  };

  const handleScanResult = (payload: ScanFieldsResponse) => {
    setStatusMessage("");
    if (!payload.eligible || !payload.fields || payload.fields.length === 0) {
      setDetectedFields([]);
      setErrorMessage("No supported interactive form fields found on this page.");
    } else {
      setDetectedFields(payload.fields);
      setErrorMessage("");
    }
  };

  const applyExtractedFields = (extractedFields: Record<string, string | null>) => {
    const newProposals: FieldFillProposal[] = detectedFields.map((field) => {
      let extracted = extractedFields[field.id] ?? extractedFields[field.name] ?? extractedFields[field.label];

      // Semantic fuzzy fallback if backend returned standard keys
      if (!extracted) {
        const idLow = field.id.toLowerCase();
        const labelLow = (field.label || "").toLowerCase();
        const combined = `${idLow} ${labelLow}`;

        if (combined.includes("name") || combined.includes("peyar")) {
          extracted = extractedFields.fullName || extractedFields.name || extractedFields.applicantName;
        } else if (combined.includes("email") || combined.includes("mail")) {
          extracted = extractedFields.email;
        } else if (combined.includes("phone") || combined.includes("mobile") || combined.includes("contact") || combined.includes("tel")) {
          extracted = extractedFields.phone || extractedFields.mobile;
        } else if (combined.includes("age") || combined.includes("vayasu")) {
          extracted = extractedFields.age;
        } else if (combined.includes("birth") || combined.includes("dob")) {
          extracted = extractedFields.dateOfBirth || extractedFields.dob;
        } else if (combined.includes("gender") || combined.includes("sex")) {
          extracted = extractedFields.gender;
        } else if (combined.includes("college") || combined.includes("institution") || combined.includes("university") || combined.includes("school")) {
          extracted = extractedFields.college || extractedFields.institution;
        } else if (combined.includes("degree") || combined.includes("course") || combined.includes("qualification")) {
          extracted = extractedFields.degree || extractedFields.qualification;
        } else if (combined.includes("city") || combined.includes("district") || combined.includes("town") || combined.includes("oor")) {
          extracted = extractedFields.city || extractedFields.district;
        } else if (combined.includes("address") || combined.includes("street") || combined.includes("mugavari")) {
          extracted = extractedFields.address;
        } else if (combined.includes("pin") || combined.includes("zip")) {
          extracted = extractedFields.pincode;
        } else if (combined.includes("job") || combined.includes("occupation") || combined.includes("profession") || combined.includes("work")) {
          extracted = extractedFields.occupation;
        } else if (combined.includes("experience") || combined.includes("exp")) {
          extracted = extractedFields.experience;
        } else if (combined.includes("id") || combined.includes("aadhaar")) {
          extracted = extractedFields.aadhaar || extractedFields.idNumber;
        }
      }

      const hasValue =
        extracted !== undefined &&
        extracted !== null &&
        String(extracted).trim() !== "" &&
        String(extracted).toLowerCase() !== "null";
      const valStr = hasValue ? String(extracted).trim() : "";

      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        currentValue: field.currentValue,
        proposedValue: valStr,
        selected: hasValue,
        confidence: hasValue ? "high" : "none",
        requiresClarification: !hasValue && field.required,
      };
    });

    setProposals(newProposals);
    setStatusMessage("");
  };

  const startVoiceRecording = async () => {
    setErrorMessage("");
    setResults(null);

    try {
      setStatusMessage("Starting microphone...");
      const rec = await recordWav();
      recorderRef.current = rec;
      setIsRecording(true);
      setStatusMessage("Listening... Speak your details naturally in English, தமிழ், or Tanglish.");
    } catch (err: any) {
      console.warn("Audio recording error:", err);
      const msg = err?.message || String(err);
      if (msg.includes("Permission denied") || msg.includes("not allowed") || msg.includes("NotAllowedError")) {
        setErrorMessage("Microphone access was denied. Please click the button below to grant permission.");
      } else {
        setErrorMessage(`Microphone error: ${msg}. You can also type or paste details directly below.`);
      }
      setIsRecording(false);
      setStatusMessage("");
    }
  };

  const stopVoiceRecording = async () => {
    if (!recorderRef.current) return;
    setIsRecording(false);
    setStatusMessage("Processing audio recording with Gemini AI...");

    try {
      const audioFile = await recorderRef.current.stop();
      recorderRef.current = null;
      await processAudio(audioFile);
    } catch (err: any) {
      console.warn("Failed stopping recording:", err);
      recorderRef.current = null;
      setErrorMessage(err?.message || "Failed to process audio recording.");
      setStatusMessage("");
    }
  };

  const processAudio = async (audioFile: File) => {
    if (detectedFields.length === 0) {
      setErrorMessage("No form fields detected to populate.");
      setStatusMessage("");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setStatusMessage("Transcribing speech and extracting details with Gemini AI...");

    try {
      const response = await extractFieldsWithAudio({
        apiUrl: settings.apiUrl,
        audioFile,
        language,
        detectedFields,
      });

      if (response.error) {
        setErrorMessage(response.error);
        setIsProcessing(false);
        setStatusMessage("");
        return;
      }

      if (response.transcript) {
        setTranscript(response.transcript);
      }

      applyExtractedFields(response.fields);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to extract field values");
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  const processTranscript = async (textToProcess: string) => {
    if (!textToProcess.trim()) {
      setErrorMessage("Please enter some details first.");
      return;
    }

    if (detectedFields.length === 0) {
      setErrorMessage("No form fields detected to populate.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setStatusMessage("Extracting structured details with Gemini AI...");

    try {
      const response = await extractFieldsWithBackend({
        apiUrl: settings.apiUrl,
        transcript: textToProcess,
        language,
        detectedFields,
      });

      if (response.error) {
        setErrorMessage(response.error);
        setIsProcessing(false);
        setStatusMessage("");
        return;
      }

      applyExtractedFields(response.fields);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to extract field values");
      setStatusMessage("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyAutofill = async () => {
    const selectedItems = proposals
      .filter((p) => p.selected && p.proposedValue.trim() !== "")
      .map((p) => ({ fieldId: p.fieldId, value: p.proposedValue.trim() }));

    if (selectedItems.length === 0) {
      setErrorMessage("Please select at least one field to autofill.");
      return;
    }

    setIsProcessing(true);
    setStatusMessage("Applying values to webpage form...");
    setErrorMessage("");

    if (typeof chrome === "undefined" || !chrome.tabs) {
      // Mock result in testing
      const mockResults: FieldFillResult[] = selectedItems.map((item) => ({
        fieldId: item.fieldId,
        label: item.fieldId,
        status: "verified",
        appliedValue: item.value,
        verifiedValue: item.value,
      }));
      setResults(mockResults);
      setIsProcessing(false);
      setStatusMessage("");
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        setErrorMessage("No active tab found.");
        setIsProcessing(false);
        setStatusMessage("");
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: "FILL_FIELDS", items: selectedItems },
        (response: { type: string; payload: FillFieldsResponse } | undefined) => {
          setIsProcessing(false);
          setStatusMessage("");

          if (chrome.runtime.lastError || !response || !response.payload) {
            setErrorMessage("Failed to send fill commands to webpage.");
          } else {
            setResults(response.payload.results);
          }
        }
      );
    } catch (err) {
      setIsProcessing(false);
      setStatusMessage("");
      setErrorMessage(err instanceof Error ? err.message : "Error applying autofill");
    }
  };

  const highlightFieldOnPage = (fieldId: string) => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_FIELD", fieldId });
        }
      });
    }
  };

  const updateProposedValue = (fieldId: string, val: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.fieldId === fieldId ? { ...p, proposedValue: val, selected: true } : p))
    );
  };

  const toggleSelectProposal = (fieldId: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.fieldId === fieldId ? { ...p, selected: !p.selected } : p))
    );
  };

  const saveSettings = (newSettings: ExtensionSettings) => {
    setSettings(newSettings);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(newSettings);
    }
    setShowSettings(false);
  };

  return (
    <div className="w-[390px] min-h-[540px] max-h-[600px] flex flex-col bg-white text-zinc-900 font-sans text-xs antialiased overflow-hidden select-none border border-zinc-200">
      {/* Top Header */}
      <header className="px-3.5 py-2.5 bg-zinc-900 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-teal-600 flex items-center justify-center font-bold text-[11px] text-white">
            M
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none text-white">mozhifill</h1>
            <p className="text-[10px] text-zinc-400 mt-0.5">Voice Autofill Extension</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mode Switcher Bar */}
      <div className="flex border-b border-zinc-200 bg-zinc-100 text-[11px] font-semibold">
        <button
          onClick={() => setActiveMode("web")}
          className={`flex-1 py-1.5 text-center transition ${
            activeMode === "web"
              ? "bg-white text-zinc-900 border-b-2 border-zinc-900 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Website Forms
        </button>
        <button
          onClick={() => setActiveMode("pdf")}
          className={`flex-1 py-1.5 text-center transition flex items-center justify-center gap-1 ${
            activeMode === "pdf"
              ? "bg-white text-zinc-900 border-b-2 border-zinc-900 shadow-xs"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <span>PDF Form Assistant</span>
          {isPdfTab && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-zinc-50">
        {/* PDF Mode View */}
        {activeMode === "pdf" && !showSettings && (
          <div className="space-y-3">
            <div className="p-3.5 bg-white rounded-lg border border-zinc-200 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-900 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  PDF Voice Form Assistant
                </span>
                <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-mono">
                  {isPdfTab ? "PDF Detected" : "Universal PDF"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Fill college admissions, scholarship applications, government KYC documents, and clinic intake forms by speaking naturally in <strong>Tamil, English, or Tanglish</strong>.
              </p>

              {isPdfTab && (
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                  <span className="font-semibold">Active PDF Tab:</span>
                  <span className="truncate flex-1 font-mono text-[10px]">{pageInfo?.title || pageInfo?.url}</span>
                </div>
              )}

              <button
                onClick={openPdfWorkspace}
                className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-md text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <span>Open in MozhiFill PDF Workspace</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>

            <div className="p-3 bg-white rounded-lg border border-zinc-200 text-[11px] space-y-2 text-zinc-600">
              <span className="font-bold text-zinc-800 block text-xs">PDF Form Features:</span>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Interactive AcroForm Filling:</strong> Text, Checkboxes, Dropdowns, and Radios.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Visual Coordinate Placement:</strong> For scanned & non-fillable digital forms.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Zero Data Retention:</strong> Client-side PDF rendering & local document export.</span>
              </div>
            </div>
          </div>
        )}

        {/* Settings Overlay */}
        {showSettings ? (
          <div className="bg-white p-3.5 rounded-lg border border-zinc-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <span className="font-bold text-xs uppercase tracking-wide text-zinc-800">Extension Settings</span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-zinc-500 hover:text-zinc-800 font-semibold text-xs"
              >
                Close
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Backend API URL</label>
              <input
                type="text"
                value={settings.apiUrl}
                onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-xs font-mono bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                placeholder="http://localhost:8080/api/voice-fill"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Local: <code>http://localhost:8080/api/voice-fill</code>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Default Speaking Language</label>
              <select
                value={settings.speakingLanguage}
                onChange={(e) =>
                  setSettings({ ...settings, speakingLanguage: e.target.value as any })
                }
                className="w-full px-2.5 py-1.5 border border-zinc-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
              >
                <option value="english">English</option>
                <option value="tamil">தமிழ் (Tamil)</option>
                <option value="tanglish">Tanglish</option>
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => saveSettings(settings)}
                className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded text-xs transition"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setSettings(DEFAULT_SETTINGS)}
                className="px-2.5 py-1.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-700 rounded text-xs transition"
              >
                Reset
              </button>
            </div>

            <div className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-100">
              <p className="font-semibold text-zinc-700">Security & Privacy:</p>
              <ul className="list-disc pl-3.5 space-y-0.5 mt-0.5">
                <li>No raw audio stored or retained.</li>
                <li>Password and payment controls strictly ignored.</li>
                <li>Forms are never submitted automatically.</li>
              </ul>
            </div>
          </div>
        ) : activeMode === "web" ? (
          <>
            {/* Page Target Status Box */}
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-xs flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="font-semibold text-zinc-900 truncate max-w-[230px]">
                    {pageInfo?.title || "Active Webpage"}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono">
                    {detectedFields.length} fields found
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-mono">
                    {detectedFields.filter((f) => f.required).length} required
                  </span>
                </div>
              </div>

              <button
                onClick={scanActiveTab}
                title="Rescan form fields"
                className="p-1.5 border border-zinc-200 hover:bg-zinc-100 rounded text-zinc-700 transition shrink-0"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* Language Selector Box */}
            <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Speaking Language
              </span>
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-100 rounded-md">
                {(["english", "tamil", "tanglish"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`py-1 text-center font-medium rounded transition text-xs ${
                      language === l
                        ? "bg-white text-zinc-900 shadow-xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {l === "english" ? "English" : l === "tamil" ? "தமிழ்" : "Tanglish"}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Control & Transcript Box */}
            <div className="bg-white p-3.5 rounded-lg border border-zinc-200 shadow-xs text-center space-y-2.5">
              <div className="flex flex-col items-center">
                <button
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={isProcessing}
                  className={`h-16 w-16 rounded-full flex items-center justify-center transition shadow-sm ${
                    isRecording
                      ? "bg-red-600 text-white animate-pulse ring-4 ring-red-200"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                >
                  {isRecording ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  )}
                </button>

                <p className="font-semibold text-xs text-zinc-800 mt-2">
                  {isRecording ? "Listening... Tap to Finish" : "Tap to Speak Form Details"}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {language === "tamil"
                    ? "எ.கா: என் பெயர் கார்த்திக், வயது 21, ஈரோட்டில் வசிக்கிறேன்"
                    : language === "tanglish"
                    ? "e.g. En peru Karthik, 21 years old, Erode la irukken"
                    : "e.g. My name is Karthik, 21 years old, phone 9876543210"}
                </p>
                <button
                  type="button"
                  onClick={openPermissionTab}
                  className="text-[10px] text-teal-700 hover:text-teal-900 underline mt-1 cursor-pointer font-medium"
                >
                  Microphone blocked? Click here to Allow
                </button>
              </div>

              {/* Live or Editable Transcript */}
              <div className="text-left space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Spoken Transcript
                </span>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Your spoken words will appear here. You can also edit or type directly..."
                  rows={2}
                  className="w-full p-2 border border-zinc-200 rounded text-xs bg-zinc-50 text-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 font-sans"
                />

                {transcript.trim() && !isRecording && (
                  <button
                    onClick={() => processTranscript(transcript)}
                    disabled={isProcessing}
                    className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded text-xs transition flex items-center justify-center gap-1.5"
                  >
                    {isProcessing ? "Processing with Gemini..." : "Extract Details with Gemini"}
                  </button>
                )}
              </div>
            </div>

            {/* Status & Error Alerts */}
            {statusMessage && (
              <div className="p-2 rounded bg-zinc-100 text-zinc-700 text-[11px] border border-zinc-200 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-ping" />
                <span>{statusMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded bg-red-50 text-red-900 text-[11px] border border-red-200 space-y-2">
                <p className="font-medium leading-relaxed">{errorMessage}</p>
                {errorMessage.toLowerCase().includes("microphone") && (
                  <button
                    type="button"
                    onClick={openPermissionTab}
                    className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Click to Grant Microphone Access (One-Click)</span>
                  </button>
                )}
              </div>
            )}

            {/* Results Review Stage */}
            {results && (
              <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200">
                  <span className="font-bold text-xs text-zinc-900">Autofill Summary</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                    {results.filter((r) => r.status === "verified").length} Fields Applied
                  </span>
                </div>

                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                  {results.map((r) => (
                    <div
                      key={r.fieldId}
                      className="p-1.5 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-between text-[11px]"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-zinc-800 block truncate">{r.fieldId}</span>
                        <span className="text-[10px] text-zinc-500 font-mono truncate block">
                          {r.appliedValue || "(empty)"}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          r.status === "verified"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "skipped"
                            ? "bg-zinc-100 text-zinc-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] leading-tight">
                  <strong>Notice:</strong> Form fields have been filled on the page. Please inspect the webpage and click Submit yourself. MozhiFill AI never automatically submits forms.
                </div>
              </div>
            )}

            {/* Proposed Values List */}
            {proposals.length > 0 && !results && (
              <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200">
                  <div>
                    <span className="font-bold text-xs text-zinc-900">Extracted Values</span>
                    <span className="text-[10px] text-zinc-500 block">
                      Review and select fields before autofilling
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700">
                    {proposals.filter((p) => p.selected).length}/{proposals.length} selected
                  </span>
                </div>

                <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                  {proposals.map((item) => (
                    <div
                      key={item.fieldId}
                      className={`p-2 rounded border transition text-xs ${
                        item.selected ? "border-zinc-300 bg-white" : "border-zinc-200 bg-zinc-50 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="flex items-center gap-1.5 font-semibold text-zinc-800 truncate cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelectProposal(item.fieldId)}
                            className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="truncate">{item.label}</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => highlightFieldOnPage(item.fieldId)}
                          title="Highlight on page"
                          className="text-[10px] text-zinc-400 hover:text-zinc-700"
                        >
                          Show on page
                        </button>
                      </div>

                      {item.currentValue && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded mb-1 truncate">
                          Existing page value: <strong>{item.currentValue}</strong>
                        </p>
                      )}

                      <input
                        type="text"
                        value={item.proposedValue}
                        onChange={(e) => updateProposedValue(item.fieldId, e.target.value)}
                        placeholder="Extracted value..."
                        className="w-full px-2 py-1 border border-zinc-200 rounded text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleApplyAutofill}
                  disabled={isProcessing}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded text-xs transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Autofill Webpage Form ({proposals.filter((p) => p.selected).length})
                </button>
              </div>
            )}
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="px-3.5 py-2 bg-white border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-500 shrink-0">
        <span>Powered by Google Gemini</span>
        <span>Zero Audio Retention</span>
      </footer>
    </div>
  );
}
