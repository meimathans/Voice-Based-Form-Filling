import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Upload,
  Mic,
  MicOff,
  Sparkles,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  FileCheck,
  Languages as LangIcon,
  RefreshCw,
  FileType,
  Eye,
  FileCode,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  WordFormField,
  parseWordDocument,
  extractFieldsFromWordText,
  generateInteractivePdfFromWordFields,
  SAMPLE_WORD_TEMPLATES,
} from "@/lib/word-form-parser";
import {
  PdfField,
  inspectPdf,
  fillPdf,
  downloadPdf,
  createCustomPdfFromDetails,
} from "@/lib/pdf-engine";
import {
  SAMPLE_PDFS,
  getSamplePdfBytes,
} from "@/lib/sample-pdf-generator";
import { recordWav } from "@/lib/record-wav";
import { speakText } from "@/lib/speech-tts";

export function PdfWorkspaceView() {
  // Document state
  const [docSourceType, setDocSourceType] = useState<"word_docx" | "pdf">("word_docx");
  const [currentPdfBytes, setCurrentPdfBytes] = useState<Uint8Array | null>(null);
  const [docFilename, setDocFilename] = useState<string>("University_Admission_HandFill_Form.docx");
  const [docTitle, setDocTitle] = useState<string>("University Admission & Merit Scholarship Form");
  const [rawWordText, setRawWordText] = useState<string>("");
  const [activeViewTab, setActiveViewTab] = useState<"pdf" | "word_text">("pdf");

  // Navigation & viewer state
  const [pageCount, setPageCount] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Field detection state
  const [fields, setFields] = useState<WordFormField[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("univ_admission_docx");

  // Paragraph / Details Upload state
  const [detailsParagraph, setDetailsParagraph] = useState<string>("");
  const [isProcessingDetails, setIsProcessingDetails] = useState<boolean>(false);

  // Voice recording & language state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [spokenLanguage, setSpokenLanguage] = useState<string>("english");
  const [transcript, setTranscript] = useState<string>("");
  const [isProcessingAi, setIsProcessingAi] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>("");

  // Notification state
  const [fillSuccessMessage, setFillSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<{ stop: () => Promise<File> } | null>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load default Word template on mount
  useEffect(() => {
    loadSampleWordForm("univ_admission_docx");
  }, []);

  // Generate preview blob URL whenever currentPdfBytes changes
  useEffect(() => {
    if (!currentPdfBytes) {
      setPreviewBlobUrl(null);
      return;
    }
    const blob = new Blob([currentPdfBytes as any], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPreviewBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [currentPdfBytes]);

  // Load sample Word template
  const loadSampleWordForm = async (templateId: string) => {
    setIsLoadingDoc(true);
    setErrorMessage(null);
    setFillSuccessMessage(null);
    try {
      const template = SAMPLE_WORD_TEMPLATES.find((t) => t.id === templateId) || SAMPLE_WORD_TEMPLATES[0];
      setDocSourceType("word_docx");
      setDocFilename(template.filename);
      setDocTitle(template.title);
      setRawWordText(template.rawText);

      // Extract separate fields from the hand-filling text
      const { title, fields: extractedFields } = extractFieldsFromWordText(template.rawText);
      setFields(extractedFields);

      // Generate the fillable AcroForm PDF corresponding to the Word template
      const pdfBytes = await generateInteractivePdfFromWordFields(title, extractedFields);
      setCurrentPdfBytes(pdfBytes);
      setPageCount(1);
      setCurrentPage(1);

      setFillSuccessMessage(`Loaded Word hand-filling template "${template.title}" and generated ${extractedFields.length} separate interactive fields.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to load Word template: ${msg}`);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  // Load standard sample PDF
  const loadSamplePdf = async (sampleId: "college_admission" | "govt_employment" | "medical_intake") => {
    setIsLoadingDoc(true);
    setErrorMessage(null);
    setFillSuccessMessage(null);
    try {
      const sample = await getSamplePdfBytes(sampleId);
      setDocSourceType("pdf");
      setDocFilename(sample.filename);
      setDocTitle(sample.title);
      setRawWordText("");
      setCurrentPdfBytes(sample.bytes);

      const inspection = await inspectPdf(sample.bytes);
      setPageCount(inspection.pageCount);
      setCurrentPage(1);

      // Map PdfField to WordFormField interface
      const mappedFields: WordFormField[] = inspection.fields.map((f: PdfField) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        type: f.type,
        options: f.options,
        required: f.required,
        currentValue: f.currentValue,
        proposedValue: f.proposedValue,
        status: f.status,
        confidence: f.confidence,
        included: f.included,
      }));

      setFields(mappedFields);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to load sample PDF: ${msg}`);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  // Handle document upload (.docx, .doc, .txt, .pdf)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isWord = lowerName.endsWith(".docx") || lowerName.endsWith(".doc") || lowerName.endsWith(".txt");
    const isPdf = lowerName.endsWith(".pdf");

    if (!isWord && !isPdf) {
      setErrorMessage("Please select a valid Word document (.docx, .doc), text file (.txt), or PDF (.pdf).");
      return;
    }

    setIsLoadingDoc(true);
    setErrorMessage(null);
    setFillSuccessMessage(null);

    try {
      const arrayBuffer = await file.arrayBuffer();

      if (isWord) {
        setDocSourceType("word_docx");
        const parsedDoc = await parseWordDocument(arrayBuffer, file.name);
        setDocFilename(file.name);
        setDocTitle(parsedDoc.title);
        setRawWordText(parsedDoc.rawText);
        setFields(parsedDoc.fields);
        if (parsedDoc.pdfBytes) {
          setCurrentPdfBytes(parsedDoc.pdfBytes);
        }
        setPageCount(1);
        setCurrentPage(1);
        const success = `Successfully converted Word document "${file.name}" into ${parsedDoc.fields.length} separate interactive fields and generated fillable PDF!`;
        setFillSuccessMessage(success);
        speakText(`Converted Word document into ${parsedDoc.fields.length} form fields`, spokenLanguage === "tamil" ? "ta" : "en");
      } else {
        setDocSourceType("pdf");
        const bytes = new Uint8Array(arrayBuffer);
        setDocFilename(file.name);
        setDocTitle(file.name.replace(/\.pdf$/i, ""));
        setRawWordText("");
        setCurrentPdfBytes(bytes);

        const inspection = await inspectPdf(bytes);
        setPageCount(inspection.pageCount);
        setCurrentPage(1);

        const mappedFields: WordFormField[] = inspection.fields.map((f: PdfField) => ({
          id: f.id,
          name: f.name,
          label: f.label,
          type: f.type,
          options: f.options,
          required: f.required,
          currentValue: f.currentValue,
          proposedValue: f.proposedValue,
          status: f.status,
          confidence: f.confidence,
          included: f.included,
        }));
        setFields(mappedFields);
        setFillSuccessMessage(`Loaded PDF "${file.name}" with ${mappedFields.length} detected fields.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to parse document: ${msg}`);
    } finally {
      setIsLoadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Voice recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current) {
        setIsProcessingAi(true);
        setAiStatusMessage("Processing speech with mozhifill multilingual engine...");
        try {
          const audioBlob = await recorderRef.current.stop();
          recorderRef.current = null;
          setIsRecording(false);
          await processVoiceInput(audioBlob, null);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMessage(`Microphone error: ${msg}`);
          setIsProcessingAi(false);
        }
      }
    } else {
      setErrorMessage(null);
      setFillSuccessMessage(null);
      try {
        const recorder = await recordWav();
        recorderRef.current = recorder;
        setIsRecording(true);
        setRecordingDuration(0);
        timerRef.current = window.setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Microphone access error: ${msg}`);
      }
    }
  };

  // Process voice input (audio blob or transcript text)
  const processVoiceInput = async (audioBlob: Blob | null, textTranscript: string | null) => {
    setIsProcessingAi(true);
    setErrorMessage(null);

    try {
      const detectedFieldsPayload = fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
      }));

      let responseData: any = null;

      if (audioBlob) {
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.wav");
        formData.append("language", spokenLanguage);
        formData.append("detectedFields", JSON.stringify(detectedFieldsPayload));

        const res = await fetch("/api/voice-fill", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to process audio.");
        }
        responseData = await res.json();
      } else if (textTranscript) {
        const res = await fetch("/api/voice-fill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: textTranscript,
            language: spokenLanguage,
            detectedFields: detectedFieldsPayload,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to extract fields.");
        }
        responseData = await res.json();
      }

      if (responseData) {
        if (responseData.transcript) {
          setTranscript(responseData.transcript);
        }

        const extractedFields: Record<string, string | null> = responseData.fields || {};
        let matchCount = 0;

        // Normalize helper for fuzzy matching
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

        setFields((prev) =>
          prev.map((field) => {
            // Direct ID match
            let rawVal = extractedFields[field.id];

            // Fuzzy match by label if direct ID missed
            if (rawVal === undefined || rawVal === null || rawVal === "") {
              const fNorm = normalize(field.label);
              for (const [k, v] of Object.entries(extractedFields)) {
                if (v !== undefined && v !== null && v !== "") {
                  const kNorm = normalize(k);
                  if (kNorm.includes(fNorm) || fNorm.includes(kNorm)) {
                    rawVal = v;
                    break;
                  }
                }
              }
            }

            if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
              matchCount++;
              return {
                ...field,
                proposedValue: field.type === "checkbox" ? rawVal === "true" || rawVal === "yes" : String(rawVal),
                status: "matched",
                confidence: 0.95,
                included: true,
              };
            }
            return field;
          })
        );

        const msg = `AI extracted ${matchCount} fields from ${spokenLanguage.toUpperCase()} speech into separate Word form fields!`;
        setFillSuccessMessage(msg);
        speakText(msg, spokenLanguage === "tamil" ? "ta" : "en");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`AI Extraction: ${msg}`);
    } finally {
      setIsProcessingAi(false);
      setAiStatusMessage("");
    }
  };

  // Update proposed value for a separate field
  const handleFieldValueChange = (id: string, value: string | boolean) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, proposedValue: value, status: "matched" } : f))
    );
  };

  // Toggle field include checkbox
  const toggleFieldIncluded = (id: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, included: !f.included } : f))
    );
  };

  // Select all / none
  const selectAllFields = (included: boolean) => {
    setFields((prev) => prev.map((f) => ({ ...f, included })));
  };

  // Reset values
  const clearAllValues = () => {
    setFields((prev) =>
      prev.map((f) => ({
        ...f,
        proposedValue: f.type === "checkbox" ? false : "",
        status: "missing",
      }))
    );
    setTranscript("");
    setFillSuccessMessage(null);
  };

  // Burn filled values into PDF and refresh preview
  const handleFillPdf = async () => {
    if (!currentPdfBytes && docSourceType !== "word_docx") {
      setErrorMessage("No document loaded to fill.");
      return;
    }

    const fieldsToFill = fields.filter((f) => f.included && f.proposedValue !== "" && f.proposedValue !== undefined);

    if (fieldsToFill.length === 0) {
      setErrorMessage("No fields selected to fill. Please extract with voice or enter values first.");
      return;
    }

    setIsLoadingDoc(true);
    setErrorMessage(null);
    setFillSuccessMessage(null);

    try {
      if (docSourceType === "word_docx") {
        // Re-generate AcroForm PDF with the filled values burned in
        const fieldValuesMap: Record<string, string | boolean> = {};
        for (const f of fieldsToFill) {
          fieldValuesMap[f.id] = f.proposedValue!;
        }

        const updatedBytes = await generateInteractivePdfFromWordFields(docTitle, fields, fieldValuesMap);
        setCurrentPdfBytes(updatedBytes);

        setFields((prev) =>
          prev.map((f) => (f.included ? { ...f, currentValue: f.proposedValue } : f))
        );

        const success = `Successfully burned ${fieldsToFill.length} fields from Word document into interactive PDF!`;
        setFillSuccessMessage(success);
        speakText(success, spokenLanguage === "tamil" ? "ta" : "en");
      } else {
        // Standard PDF fill
        const fillPayload = fieldsToFill.map((f) => ({
          id: f.id,
          value: f.proposedValue,
          type: f.type,
        }));
        const updatedBytes = await fillPdf(currentPdfBytes!, fillPayload as any);
        setCurrentPdfBytes(updatedBytes);

        setFields((prev) =>
          prev.map((f) => (f.included ? { ...f, currentValue: f.proposedValue } : f))
        );

        const success = `Successfully filled ${fieldsToFill.length} fields into the PDF document!`;
        setFillSuccessMessage(success);
        speakText(success, spokenLanguage === "tamil" ? "ta" : "en");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to fill PDF: ${msg}`);
    } finally {
      setIsLoadingDoc(false);
    }
  };

  // Download filled PDF
  const handleDownload = () => {
    if (!currentPdfBytes) return;
    const cleanName = docFilename.replace(/\.(docx|doc|pdf|txt)$/i, "");
    downloadPdf(currentPdfBytes, `completed_${cleanName}.pdf`);
  };

  // Download blank fillable PDF template
  const handleDownloadTemplate = async () => {
    if (docSourceType === "word_docx") {
      const templateBytes = await generateInteractivePdfFromWordFields(docTitle, fields);
      const cleanName = docFilename.replace(/\.(docx|doc|pdf|txt)$/i, "");
      downloadPdf(templateBytes, `fillable_template_${cleanName}.pdf`);
    } else if (currentPdfBytes) {
      handleDownload();
    }
  };

  // Export filled data as JSON
  const handleExportJson = () => {
    const data: Record<string, any> = {};
    for (const f of fields) {
      if (f.proposedValue !== undefined && f.proposedValue !== "") {
        data[f.label] = f.proposedValue;
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docFilename.replace(/\.[^/.]+$/, "")}_extracted_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick speech sample insertion
  const applyQuickSpeechPrompt = (sampleText: string) => {
    setTranscript(sampleText);
    processVoiceInput(null, sampleText);
  };

  // Upload raw details file
  const handleUploadTextFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setDetailsParagraph(text);
      }
    };
    reader.readAsText(file);
    if (textFileInputRef.current) textFileInputRef.current.value = "";
  };

  // Synthesize custom PDF form from paragraph
  const handleGenerateNewFormFromParagraph = async () => {
    if (!detailsParagraph.trim()) {
      setErrorMessage("Please enter or upload a paragraph of details first.");
      return;
    }

    setIsProcessingDetails(true);
    setErrorMessage(null);
    setFillSuccessMessage(null);

    try {
      const res = await fetch("/api/voice-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: detailsParagraph,
          language: spokenLanguage,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to extract details from paragraph.");
      }

      const data = await res.json();
      const extracted: Record<string, string | null> = data.fields || {};

      const labelsMap: Record<string, string> = {
        fullName: "Full Name",
        dateOfBirth: "Date of Birth",
        age: "Age",
        gender: "Gender",
        phone: "Phone Number",
        email: "Email Address",
        college: "College / Institution",
        degree: "Degree / Qualification",
        address: "Permanent Address",
        city: "City / Location",
        pincode: "Pincode",
        aadhaar: "Aadhaar / National ID",
        experience: "Experience (Years)",
        occupation: "Occupation / Job",
        scholarship: "Scholarship Opt",
        declaration: "Declaration Accepted",
      };

      const fieldList: Array<{ label: string; value: string | boolean }> = [];
      for (const [k, v] of Object.entries(extracted)) {
        if (v !== null && v !== undefined && v !== "" && String(v).toLowerCase() !== "null") {
          fieldList.push({
            label: labelsMap[k] || k,
            value: v === "true" ? true : v === "false" ? false : v,
          });
        }
      }

      if (fieldList.length === 0) {
        fieldList.push({ label: "Applicant Information", value: detailsParagraph.slice(0, 100) });
      }

      const newPdfBytes = await createCustomPdfFromDetails("Official Application Dossier", fieldList);
      setDocFilename("generated_application_form.pdf");
      setDocTitle("Official Application Dossier (Generated)");
      setDocSourceType("pdf");
      setRawWordText("");
      setCurrentPdfBytes(newPdfBytes);

      const inspection = await inspectPdf(newPdfBytes);
      setPageCount(inspection.pageCount);
      setCurrentPage(1);

      const mappedFields: WordFormField[] = inspection.fields.map((f: PdfField) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        type: f.type,
        options: f.options,
        required: f.required,
        currentValue: f.currentValue,
        proposedValue: f.proposedValue,
        status: f.status,
        confidence: f.confidence,
        included: f.included,
      }));
      setFields(mappedFields);

      const success = `Successfully created custom PDF Form with ${fieldList.length} fields generated from your details!`;
      setFillSuccessMessage(success);
      speakText(success, spokenLanguage === "tamil" ? "ta" : "en");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to generate PDF form: ${msg}`);
    } finally {
      setIsProcessingDetails(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileType className="h-6 w-6 text-foreground" />
              Word & PDF Voice Filling Workspace
            </h1>
            <Badge
              variant="outline"
              className={
                docSourceType === "word_docx"
                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
              }
            >
              {docSourceType === "word_docx"
                ? "Word Hand-Fill Form Converted to Interactive PDF"
                : "Standard Fillable PDF AcroForm"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Upload any hand-filling Word document (.docx, .doc) or PDF. MozhiFill parses the inputs into separate fields, converts them to an interactive PDF, and fills them with your voice in Tamil, English, or Tanglish.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".docx,.doc,.txt,.pdf"
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Upload Word (.docx) or PDF
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            disabled={!currentPdfBytes}
            className="flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" />
            Download Completed PDF
          </Button>
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {fillSuccessMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{fillSuccessMessage}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFillSuccessMessage(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:bg-destructive/20"
            onClick={() => setErrorMessage(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Template Selector & Document Metadata Bar */}
      <Card className="border bg-card shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40 shrink-0">
              {docSourceType === "word_docx" ? (
                <FileType className="h-5 w-5 text-foreground" />
              ) : (
                <FileCheck className="h-5 w-5 text-foreground" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                <span>{docTitle}</span>
                <span className="text-xs text-muted-foreground font-mono">({docFilename})</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                <span>Converted Fields: <strong className="text-foreground">{fields.length}</strong></span>
                <span>•</span>
                <span>Filled: <strong className="text-foreground">{fields.filter((f) => f.proposedValue).length}</strong></span>
                <span>•</span>
                <span>Format: <strong className="text-foreground uppercase">{docSourceType === "word_docx" ? "Word Hand-Fill (.docx)" : "AcroForm PDF"}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> Zero Audio Retention
                </span>
              </div>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Load Preset:</span>
            <Select
              value={selectedTemplateId}
              onValueChange={(val: string) => {
                setSelectedTemplateId(val);
                if (val.endsWith("_docx")) {
                  loadSampleWordForm(val);
                } else {
                  loadSamplePdf(val as any);
                }
              }}
            >
              <SelectTrigger className="h-9 w-full md:w-[300px] text-xs">
                <SelectValue placeholder="Choose a form template" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Word Hand-Filling Forms (.docx)
                </div>
                {SAMPLE_WORD_TEMPLATES.map((w) => (
                  <SelectItem key={w.id} value={w.id} className="text-xs font-medium">
                    📝 {w.title}
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-1 border-t pt-1.5">
                  Standard PDF AcroForms (.pdf)
                </div>
                {SAMPLE_PDFS.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    📄 {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Voice Assistant & Transcript Controls */}
      <Card className="border bg-card shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <CardTitle className="text-base font-bold">Voice-Based Form Filling</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                Tamil (தமிழ்) • English • Tanglish
              </Badge>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-2">
              <LangIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={spokenLanguage} onValueChange={setSpokenLanguage}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english" className="text-xs">English</SelectItem>
                  <SelectItem value="tamil" className="text-xs">Tamil (தமிழ்)</SelectItem>
                  <SelectItem value="tanglish" className="text-xs">Tanglish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 sm:px-6 space-y-4">
          {/* Recording & Input Controls Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant={isRecording ? "destructive" : "default"}
              onClick={toggleRecording}
              disabled={isProcessingAi}
              className="h-11 px-5 flex items-center justify-center gap-2 font-medium"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 animate-pulse" />
                  <span>Stop Recording ({recordingDuration}s)</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span>Start Voice Recording</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => processVoiceInput(null, transcript)}
              disabled={isProcessingAi || !transcript.trim()}
              className="h-11 flex items-center justify-center gap-2"
            >
              {isProcessingAi ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Matching Fields...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Match Fields with AI</span>
                </>
              )}
            </Button>

            {transcript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTranscript("")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Transcript
              </Button>
            )}
          </div>

          {/* Transcript Editable Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Spoken Transcript (Live speech or type directly):</span>
              {aiStatusMessage && <span className="text-foreground animate-pulse">{aiStatusMessage}</span>}
            </div>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Click 'Start Voice Recording' or enter: 'En peru Arun Kumar, date of birth 15 March 2005, gender Male, phone 9876543210, college Kongu Engineering College, address Erode'..."
              className="min-h-[72px] text-sm resize-none bg-background font-sans"
            />
          </div>

          {/* Preset spoken phrases for testing */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground mr-1">Demo Voice Inputs:</span>
            <button
              onClick={() =>
                applyQuickSpeechPrompt(
                  "En peru Arun Kumar, date of birth 2005-03-15, gender Male, mobile 9876543210, email arun@gmail.com, college Kongu Engineering College, degree AI and Data Science, address Perundurai Erode"
                )
              }
              className="text-[11px] px-2.5 py-1 rounded border bg-muted/30 hover:bg-muted text-foreground transition"
            >
              🎓 College Admission (Tanglish)
            </button>
            <button
              onClick={() =>
                applyQuickSpeechPrompt(
                  "என் பெயர் ரவி குமார், பிறந்த தேதி 1998-06-12, ஆண், ஆதார் எண் 987654321098, தொலைபேசி 9876543210, சொந்த ஊர் சேலம், கல்வி பி.இ கணினி அறிவியல், 3 வருட அனுபவம்"
                )
              }
              className="text-[11px] px-2.5 py-1 rounded border bg-muted/30 hover:bg-muted text-foreground transition"
            >
              🇮🇳 Government KYC (Tamil தமிழ்)
            </button>
            <button
              onClick={() =>
                applyQuickSpeechPrompt(
                  "Patient name is Priya Sundaram, date of birth 2000-11-20, gender Female, emergency contact 9840123456, email priya@gmail.com, address Coimbatore, known allergies penicillin"
                )
              }
              className="text-[11px] px-2.5 py-1 rounded border bg-muted/30 hover:bg-muted text-foreground transition"
            >
              🏥 Medical Clinic (English)
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Paragraph / Bio / Text Upload Card */}
      <Card className="border bg-card shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-foreground" />
              <CardTitle className="text-sm font-bold">Upload / Paste Details (Auto-Fill or Synthesize Form)</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={textFileInputRef}
                onChange={handleUploadTextFile}
                accept=".txt,.md,.json"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => textFileInputRef.current?.click()}
                className="h-7 text-xs flex items-center gap-1.5"
              >
                <Upload className="h-3 w-3" />
                Upload Text Notes (.txt)
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Paste any paragraph, notes, or bio. MozhiFill will extract the fields and auto-fill the current form, or synthesize a brand-new PDF application for you.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 pb-4 sm:px-6 space-y-3">
          <Textarea
            value={detailsParagraph}
            onChange={(e) => setDetailsParagraph(e.target.value)}
            placeholder="Type or paste details: 'Candidate name is Arun Kumar, age 21, DOB 2005-03-15, college Kongu Engineering College, degree AI and Data Science, phone 9876543210, email arun@kongu.edu, address Erode. I accept the declaration.'..."
            className="min-h-[72px] text-xs resize-none bg-background font-sans"
          />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              onClick={() => processVoiceInput(null, detailsParagraph)}
              disabled={isProcessingAi || !detailsParagraph.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Match & Fill Fields from Paragraph</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateNewFormFromParagraph}
              disabled={isProcessingDetails || !detailsParagraph.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold"
            >
              {isProcessingDetails ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Synthesizing Document...</span>
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  <span>Create Brand-New PDF Form from Paragraph</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Split Layout: Left Document Viewer | Right Separate Fields Review Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Converted PDF Viewer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border bg-card shadow-sm overflow-hidden">
            <CardHeader className="p-3 border-b bg-muted/20 flex flex-row items-center justify-between">
              {/* Tab Switcher: PDF Preview vs Original Word Text */}
              <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background">
                <Button
                  variant={activeViewTab === "pdf" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveViewTab("pdf")}
                  className="h-7 text-xs px-2.5 flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Interactive PDF Preview</span>
                </Button>
                {rawWordText && (
                  <Button
                    variant={activeViewTab === "word_text" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveViewTab("word_text")}
                    className="h-7 text-xs px-2.5 flex items-center gap-1.5"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>Word Source Text</span>
                  </Button>
                )}
              </div>

              {/* Zoom & Page Controls */}
              {activeViewTab === "pdf" && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground">
                      {currentPage} / {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={currentPage >= pageCount}
                      onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs font-mono text-muted-foreground min-w-[2.5rem] text-center">
                      {zoomLevel}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setZoomLevel((z) => Math.min(175, z + 15))}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0 bg-muted/10 relative flex items-center justify-center min-h-[580px]">
              {activeViewTab === "pdf" ? (
                previewBlobUrl ? (
                  <div className="w-full h-[620px] overflow-auto flex items-center justify-center p-2">
                    <iframe
                      src={`${previewBlobUrl}#toolbar=0&navpanes=0&page=${currentPage}&zoom=${zoomLevel}`}
                      title="Converted PDF Document Preview"
                      className="w-full h-full rounded border bg-white shadow-inner"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
                    <FileText className="h-12 w-12 mb-2 stroke-1" />
                    <p className="text-sm">No PDF preview available</p>
                  </div>
                )
              ) : (
                <div className="w-full h-[620px] overflow-auto p-4 bg-muted/20">
                  <div className="rounded border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-bold text-foreground">
                        Original Hand-Filling Word Document Structure
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {fields.length} Inputs Detected
                      </Badge>
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed select-text">
                      {rawWordText}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Separate Form Fields Review Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border bg-card shadow-sm">
            <CardHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <span>Separated Form Fields</span>
                    <Badge variant="outline" className="text-[11px] font-mono">
                      {fields.filter((f) => f.proposedValue).length} / {fields.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Fields parsed from Word input blanks & lines
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => selectAllFields(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => selectAllFields(false)}
                  >
                    None
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Field Cards Scroll Area */}
            <CardContent className="p-3 max-h-[540px] overflow-y-auto space-y-3">
              {fields.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  No fields detected. Upload a Word document or select a preset template above.
                </div>
              ) : (
                fields.map((field) => (
                  <div
                    key={field.id}
                    className={`rounded-lg border p-3 transition-colors ${
                      field.included
                        ? "bg-card border-border shadow-xs"
                        : "bg-muted/30 border-muted opacity-60"
                    }`}
                  >
                    {/* Field Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFieldIncluded(field.id)}
                          className="text-foreground hover:opacity-80 transition"
                          title="Toggle field inclusion in PDF"
                        >
                          {field.included ? (
                            <CheckSquare className="h-4 w-4 text-foreground" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <span className="text-xs font-semibold text-foreground">
                          {field.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 capitalize">
                          {field.type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-1.5 py-0 ${
                            field.status === "matched"
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              : "border-muted text-muted-foreground"
                          }`}
                        >
                          {field.status === "matched" ? "Matched" : "Missing"}
                        </Badge>
                      </div>
                    </div>

                    {/* Field Value Input Control */}
                    {field.type === "checkbox" ? (
                      <div className="flex items-center justify-between py-1 px-1">
                        <span className="text-xs text-muted-foreground">Accept / Check option</span>
                        <Switch
                          checked={Boolean(field.proposedValue)}
                          onCheckedChange={(checked) => handleFieldValueChange(field.id, checked)}
                          disabled={!field.included}
                        />
                      </div>
                    ) : field.type === "dropdown" && field.options && field.options.length > 0 ? (
                      <Select
                        value={String(field.proposedValue || "")}
                        onValueChange={(val) => handleFieldValueChange(field.id, val)}
                        disabled={!field.included}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Choose option..." />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((opt) => (
                            <SelectItem key={opt} value={opt} className="text-xs">
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : field.type === "multiline" ? (
                      <Textarea
                        value={String(field.proposedValue || "")}
                        onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        disabled={!field.included}
                        className="min-h-[50px] text-xs resize-none bg-background"
                      />
                    ) : (
                      <Input
                        value={String(field.proposedValue || "")}
                        onChange={(e) => handleFieldValueChange(field.id, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        disabled={!field.included}
                        className="h-8 text-xs bg-background"
                      />
                    )}

                    {/* Current burned value vs proposed indicator */}
                    {field.currentValue && field.currentValue !== field.proposedValue && (
                      <div className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-between">
                        <span>Current in PDF: {String(field.currentValue)}</span>
                        <button
                          onClick={() => handleFieldValueChange(field.id, field.currentValue!)}
                          className="underline hover:text-foreground text-[10px]"
                        >
                          Revert
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>

            {/* Panel Bottom Action Bar (Fill & Export) */}
            <div className="p-4 border-t bg-muted/10 space-y-2">
              <Button
                variant="default"
                onClick={handleFillPdf}
                disabled={isLoadingDoc || fields.filter((f) => f.included && f.proposedValue).length === 0}
                className="w-full flex items-center justify-center gap-2 h-10 font-medium"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Fill Values into Interactive PDF</span>
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="text-xs flex items-center justify-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Fillable PDF Template
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportJson}
                  className="text-xs flex items-center justify-center gap-1"
                >
                  <FileCode className="h-3 w-3" />
                  Export JSON
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllValues}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Values
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!currentPdfBytes}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Completed PDF
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
