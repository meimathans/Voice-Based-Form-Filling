import { DetectedField } from "./types";

export interface ExtractFieldsRequest {
  apiUrl: string;
  transcript: string;
  language: "english" | "tamil" | "tanglish";
  detectedFields: DetectedField[];
}

export interface ExtractAudioRequest {
  apiUrl: string;
  audioFile: File | Blob;
  language: "english" | "tamil" | "tanglish";
  detectedFields: DetectedField[];
}

export interface ExtractFieldsResponse {
  transcript: string;
  fields: Record<string, string | null>;
  error?: string;
}

export async function extractFieldsWithAudio({
  apiUrl,
  audioFile,
  language,
  detectedFields,
}: ExtractAudioRequest): Promise<ExtractFieldsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const formData = new FormData();
    formData.append("file", audioFile, "recording.wav");
    formData.append("language", language);
    formData.append(
      "detectedFields",
      JSON.stringify(
        detectedFields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
        }))
      )
    );

    const res = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {
        const text = await res.text();
        if (text) errorMsg = text.slice(0, 150);
      }
      return { transcript: "", fields: {}, error: errorMsg };
    }

    const data = await res.json();
    return {
      transcript: data.transcript || "",
      fields: data.fields || {},
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { transcript: "", fields: {}, error: "Audio processing timed out. Please try speaking again." };
    }
    const msg = err instanceof Error ? err.message : "Failed to connect to MozhiFill backend";
    return {
      transcript: "",
      fields: {},
      error: `${msg}. Please ensure MozhiFill backend is running at ${apiUrl}`,
    };
  }
}

export async function extractFieldsWithBackend({
  apiUrl,
  transcript,
  language,
  detectedFields,
}: ExtractFieldsRequest): Promise<ExtractFieldsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const payload = {
      transcript: transcript.trim(),
      language,
      detectedFields: detectedFields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
      })),
    };

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errJson = await res.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {
        const text = await res.text();
        if (text) errorMsg = text.slice(0, 150);
      }
      return { transcript, fields: {}, error: errorMsg };
    }

    const data = await res.json();
    return {
      transcript: data.transcript || transcript,
      fields: data.fields || {},
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return { transcript, fields: {}, error: "Extraction request timed out. Please try again." };
    }
    const msg = err instanceof Error ? err.message : "Failed to connect to MozhiFill backend";
    return {
      transcript,
      fields: {},
      error: `${msg}. Please ensure MozhiFill backend is running at ${apiUrl}`,
    };
  }
}
