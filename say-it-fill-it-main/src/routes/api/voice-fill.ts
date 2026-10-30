import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const MAX_BYTES = 20 * 1024 * 1024;

const FIELDS = [
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
] as const;

const LANG_HINTS: Record<string, { languages: string[]; prompt: string }> = {
  english: { languages: ["en"], prompt: "A person speaking English, giving personal details for a form." },
  tamil: { languages: ["ta"], prompt: "ஒருவர் தமிழில் தனது தனிப்பட்ட விவரங்களைக் கூறுகிறார். Transcribe in Tamil script." },
  tanglish: {
    languages: ["ta", "en"],
    prompt: "Tanglish: Tamil and English mixed speech giving personal details. Transcribe in Latin (Roman) script, e.g. 'en peru Ravi, enakku 25 vayasu'.",
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function mapToDetectedFields(
  extractedStandard: Record<string, string | null>,
  detectedFields: Array<{ id: string; label: string; type?: string }>
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const f of detectedFields) {
    if (extractedStandard[f.id] !== undefined && extractedStandard[f.id] !== null) {
      result[f.id] = extractedStandard[f.id];
      continue;
    }
    const idLow = f.id.toLowerCase();
    const labelLow = (f.label || "").toLowerCase();
    const combined = `${idLow} ${labelLow}`;

    if (combined.includes("college") || combined.includes("institution") || combined.includes("university")) {
      result[f.id] = extractedStandard.college || extractedStandard.institution || null;
    } else if (combined.includes("degree") || combined.includes("qualification") || combined.includes("course")) {
      result[f.id] = extractedStandard.degree || extractedStandard.qualification || null;
    } else if (combined.includes("aadhaar") || combined.includes("national id") || combined.includes("id proof")) {
      result[f.id] = extractedStandard.aadhaar || extractedStandard.idNumber || null;
    } else if (combined.includes("experience") || combined.includes("exp")) {
      result[f.id] = extractedStandard.experience || null;
    } else if (combined.includes("scholarship") || combined.includes("declaration") || combined.includes("consent")) {
      result[f.id] = extractedStandard.scholarship !== undefined ? extractedStandard.scholarship : "true";
    } else if (combined.includes("name") || combined.includes("peyar") || combined.includes("applicant")) {
      result[f.id] = extractedStandard.fullName || extractedStandard.applicantName || null;
    } else if (combined.includes("email") || combined.includes("mail")) {
      result[f.id] = extractedStandard.email || null;
    } else if (combined.includes("phone") || combined.includes("mobile") || combined.includes("tel") || combined.includes("contact")) {
      result[f.id] = extractedStandard.phone || null;
    } else if (combined.includes("age") || combined.includes("vayasu")) {
      result[f.id] = extractedStandard.age || null;
    } else if (combined.includes("birth") || combined.includes("dob") || combined.includes("pirantha")) {
      result[f.id] = extractedStandard.dateOfBirth || null;
    } else if (combined.includes("gender") || combined.includes("sex") || combined.includes("paalinam")) {
      result[f.id] = extractedStandard.gender || null;
    } else if (combined.includes("city") || combined.includes("town") || combined.includes("district") || combined.includes("oor")) {
      result[f.id] = extractedStandard.city || extractedStandard.district || null;
    } else if (combined.includes("pin") || combined.includes("zip") || combined.includes("postal") || combined.includes("anjal")) {
      result[f.id] = extractedStandard.pincode || null;
    } else if (combined.includes("job") || combined.includes("profession") || combined.includes("occupation") || combined.includes("velai") || combined.includes("work")) {
      result[f.id] = extractedStandard.occupation || null;
    } else if (combined.includes("address") || combined.includes("street") || combined.includes("mugavari") || combined.includes("addr")) {
      result[f.id] = extractedStandard.address || null;
    } else {
      result[f.id] = null;
    }
  }
  return result;
}

function readEnvVar(name: string): string | undefined {
  if (process.env[name]) return process.env[name]?.trim();
  try {
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), ".env.local"),
      path.resolve(process.cwd(), "say-it-fill-it-main", ".env"),
      path.resolve(process.cwd(), "..", ".env"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, "utf-8");
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("#")) continue;
          const eq = trimmed.indexOf("=");
          if (eq !== -1) {
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (key === name && val) return val;
          }
        }
      }
    }
  } catch {
    // Ignore in edge/serverless environments
  }
  return undefined;
}

function parseErrorMessage(err: unknown): string {
  if (!err) return "Unknown error occurred.";
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as any)?.status || (err as any)?.httpMeta?.response?.status;

  if (status === 400 || msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
    return "Invalid Gemini API key. Please check your GEMINI_API_KEY in the backend .env file.";
  }
  if (status === 403 || msg.includes("PERMISSION_DENIED")) {
    return "Permission denied for Gemini API. Please check your project settings and permissions at Google AI Studio.";
  }
  if (status === 404 || msg.includes("NOT_FOUND") || msg.includes("no longer available")) {
    return "The configured model was not found or is unavailable for this API key. Please check model access at Google AI Studio.";
  }
  if (status === 429 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
    return "Gemini API rate limit or quota exceeded. Please wait a moment and try again or check your account limits at Google AI Studio.";
  }
  if (status === 500 || status === 503 || msg.includes("UNAVAILABLE")) {
    return "Gemini API service is temporarily unavailable due to high demand. Please try again shortly.";
  }
  return msg;
}

function normalizeDateToIso(str: string): string | null {
  if (!str) return null;
  const s = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }

  // English textual month (e.g. 15 August 1995 or August 15 1995)
  const monthMap: Record<string, string> = {
    jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
    apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
    aug: "08", august: "08", sep: "09", september: "09", oct: "10", october: "10",
    nov: "11", november: "11", dec: "12", december: "12",
  };
  const textual = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-zA-Z]+)[,\s]+(\d{4})/i) ||
                  s.match(/([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i);
  if (textual) {
    const isFirstNum = /^\d+$/.test(textual[1]);
    const dStr = isFirstNum ? textual[1] : textual[2];
    const mStr = (isFirstNum ? textual[2] : textual[1]).toLowerCase();
    const yStr = textual[3];
    const mNum = monthMap[mStr.slice(0, 3)] || monthMap[mStr];
    if (mNum) {
      return `${yStr}-${mNum}-${dStr.padStart(2, "0")}`;
    }
  }

  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return s;
}

function normalizeGender(val: string): string | null {
  const v = val.toLowerCase().trim();
  if (["male", "m", "man", "boy", "aan", "aanu", "ஆண்"].includes(v) || v.startsWith("male")) return "Male";
  if (["female", "f", "woman", "girl", "pen", "ponnu", "pombala", "பெண்"].includes(v) || v.startsWith("female")) return "Female";
  if (["other", "others", "transgender", "non-binary", "மற்றவை"].includes(v)) return "Other";
  return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
}

export function normalizeFieldValue(f: string, val: string | null): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str || str.toLowerCase() === "null") return null;

  if (f === "gender") {
    return normalizeGender(str);
  }
  if (f === "dateOfBirth" || f.toLowerCase().includes("dob") || f.toLowerCase().includes("birth")) {
    return normalizeDateToIso(str);
  }
  if (f === "age") {
    const m = str.match(/\d{1,3}/);
    return m ? m[0] : str;
  }
  if (f === "phone" || f.toLowerCase().includes("phone") || f.toLowerCase().includes("mobile")) {
    const digits = str.replace(/\D/g, "");
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    const m = digits.match(/[6-9]\d{9}/);
    return m ? m[0] : (digits.length >= 10 ? digits.slice(-10) : digits);
  }
  if (f === "pincode" || f.toLowerCase().includes("pincode") || f.toLowerCase().includes("postal")) {
    const digits = str.replace(/\D/g, "");
    const m = digits.match(/[1-9]\d{5}/);
    return m ? m[0] : (digits.slice(0, 6) || str);
  }
  if (f === "email" || f.toLowerCase().includes("email")) {
    return str.toLowerCase().replace(/\s+/g, "");
  }
  if (f === "fullName" || f.toLowerCase().includes("name")) {
    return str.replace(/[.,;:]+$/, "").trim();
  }
  return str;
}

function sanitizeResult(parsed: any): { transcript: string; fields: Record<string, string | null> } {
  const transcript = typeof parsed?.transcript === "string" ? parsed.transcript.trim() : "";
  const rawFields = parsed?.fields && typeof parsed.fields === "object" ? parsed.fields : {};
  const fields: Record<string, string | null> = {};

  for (const f of FIELDS) {
    const val = rawFields[f];
    fields[f] = normalizeFieldValue(f, val !== undefined ? val : null);
  }

  return { transcript, fields };
}

async function processWithGemini(
  apiKey: string,
  audioBuffer: ArrayBuffer,
  mimeType: string,
  language: string,
  detectedFields?: Array<{ id: string; label: string; type?: string }> | null
): Promise<{ transcript: string; fields: Record<string, string | null> }> {
  const base64Audio = Buffer.from(audioBuffer).toString("base64");
  const hint = LANG_HINTS[language] ?? LANG_HINTS["english"]!;

  const fieldsInstructions =
    detectedFields && detectedFields.length > 0
      ? `2. "fields": Extract values for these detected form fields:
${detectedFields.map((f) => `- "${f.id}": ${f.label} (${f.type || "text"})`).join("\n")}
Return valid JSON matching: {"transcript": "...", "fields": {${detectedFields.map((f) => `"${f.id}": "extracted value or null"`).join(", ")}}}`
      : `2. "fields": Extract personal details with keys: fullName, age, gender, dateOfBirth, phone, email, address, city, pincode, occupation, college, degree, aadhaar.
Return valid JSON matching: {"transcript": "...", "fields": {...}}`;

  const prompt = `You are MozhiFill AI, an intelligent multilingual assistant that accurately transcribes spoken audio and extracts structured form details.
Spoken Language: ${language.toUpperCase()}
Language context: ${hint.prompt}

Tasks:
1. "transcript": Transcribe the speech accurately into the "transcript" property.
   - For English speech: transcribe in standard English.
   - For Tamil speech: transcribe in Tamil script.
   - For Tanglish speech: transcribe in Latin (Roman) script representing Tamil and English mixed words (e.g. 'en peru Ravi Kumar, enakku 28 vayasu, naan Chennai la irukken').
${fieldsInstructions}

CRITICAL RULES:
- If a field is not explicitly mentioned in the audio, set its value to null. NEVER invent data.
- Return ONLY valid JSON matching the requested schema.`;

  // Verified Google Generative Language models available for this API key
  const standardModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-pro-latest",
  ];
  let lastErrorText = "";

  for (const model of standardModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType || "audio/wav",
                    data: base64Audio,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (detectedFields && detectedFields.length > 0) {
            const rawF = parsed?.fields || {};
            const customF: Record<string, string | null> = {};
            for (const df of detectedFields) {
              customF[df.id] =
                rawF[df.id] !== undefined && rawF[df.id] !== null && String(rawF[df.id]).toLowerCase() !== "null"
                  ? String(rawF[df.id]).trim()
                  : null;
            }
            return {
              transcript: typeof parsed?.transcript === "string" ? parsed.transcript.trim() : "",
              fields: customF,
            };
          }
          return sanitizeResult(parsed);
        }
      } else {
        const errorBody = await res.text();
        lastErrorText = `${model} returned ${res.status}: ${errorBody}`;
        if (res.status === 400 || res.status === 403) {
          throw new Error(parseErrorMessage(errorBody));
        }
        // If 404 or 503, continue to next model
        continue;
      }
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes("Invalid Gemini API key") || e.message.includes("Permission denied"))) {
        throw e;
      }
      lastErrorText = e instanceof Error ? e.message : String(e);
    }
  }

  // Also try interactions endpoint if available
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        input: [
          { type: "audio", data: base64Audio, mime_type: mimeType || "audio/wav" },
          { type: "text", text: prompt },
        ],
        response_format: { type: "text", mime_type: "application/json" },
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as any;
      const modelStep = data?.steps?.find((s: any) => s.type === "model_output");
      const rawJsonText =
        modelStep?.content?.find((c: any) => c.type === "text")?.text ||
        modelStep?.content?.[0]?.text ||
        data?.output_text;
      if (rawJsonText) {
        return sanitizeResult(JSON.parse(rawJsonText));
      }
    }
  } catch {
    // Continue to error reporting
  }

  throw new Error(parseErrorMessage(lastErrorText || "Gemini processing failed."));
}

/**
 * Heuristic fallback parser for offline/demo/testing scenarios.
 */
function heuristicExtract(transcript: string, fieldKeys: readonly string[] = FIELDS): Record<string, string | null> {
  const fields: Record<string, string | null> = {};
  for (const k of fieldKeys) fields[k] = null;

  // Name: "My name is Karthik", "En peru Ravi", "Naan Ravi", "என் பெயர் ரவி குமார்"
  const nameMatch =
    transcript.match(/(?:my name is|candidate name is|full name is|name is|en peru|peru|en peyar|peyar(?: is)?|என் பெயர்|பெயர்)\s+([A-Za-z\u0B80-\u0BFF\s.]{2,40})/i) ||
    transcript.match(/(?:nan|naan|i am|நான்)\s+([A-Za-z\u0B80-\u0BFF]+(?:\s+[A-Za-z\u0B80-\u0BFF]+)?)/i);
  if (nameMatch && nameMatch[1]) {
    fields.fullName = normalizeFieldValue("fullName", nameMatch[1].trim());
  }

  // Age: "28 years old", "28 vayasu", "28 வயது", "age 28", "21 years", "enakku 28 vayasu"
  const ageMatch =
    transcript.match(/(\d{1,3})\s*(?:years old|vayasu|years|age|வயது|vayathu)/i) ||
    transcript.match(/(?:age|vayasu|வயது|vayathu)\s*(?:is)?\s*(\d{1,3})/i) ||
    transcript.match(/(?:enakku|எனக்கு)\s*(\d{1,3})\s*(?:vayasu|வயது)/i);
  if (ageMatch && ageMatch[1]) {
    fields.age = normalizeFieldValue("age", ageMatch[1]);
  }

  // Gender: Male / Female / Other
  if (/\b(?:female|woman|lady|pen|ponnu|pombala)\b|பெண்/i.test(transcript)) {
    fields.gender = "Female";
  } else if (/\b(?:male|man|gent|aan|aanu|paiyan)\b|ஆண்/i.test(transcript)) {
    fields.gender = "Male";
  } else if (/\b(?:other|transgender|non-binary)\b|மற்றவை/i.test(transcript)) {
    fields.gender = "Other";
  }

  // Date of Birth
  const dobMatch =
    transcript.match(/(?:date of birth|dob|born on|pirantha thethi|பிறந்த தேதி)\s*(?:is|on)?\s*([0-9]{1,4}[-/.\s][0-9]{1,2}[-/.\s][0-9]{1,4}|[0-9]{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]+\s+[0-9]{4})/i) ||
    transcript.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/) ||
    transcript.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
  if (dobMatch && dobMatch[1]) {
    fields.dateOfBirth = normalizeFieldValue("dateOfBirth", dobMatch[1]);
  }

  // Phone: 10 digits
  const phoneMatch =
    transcript.replace(/[\s-]/g, "").match(/(?:\+91|91|0)?([6-9]\d{9})/) ||
    transcript.match(/\b([6-9]\d{9})\b/);
  if (phoneMatch && phoneMatch[1]) {
    fields.phone = normalizeFieldValue("phone", phoneMatch[1]);
  }

  // Email
  const emailMatch =
    transcript.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
    transcript.match(/([a-zA-Z0-9._%+-]+)\s*(?:at|@)\s*([a-zA-Z0-9.-]+)\s*(?:dot|\.)\s*(com|in|org|net|edu|co)/i);
  if (emailMatch) {
    if (emailMatch[3]) {
      fields.email = `${emailMatch[1]}@${emailMatch[2]}.${emailMatch[3]}`.toLowerCase().replace(/\s+/g, "");
    } else {
      fields.email = emailMatch[1].toLowerCase().trim().replace(/\s+/g, "");
    }
  }

  // City: "in Chennai", "Erode-la irukken", "Chennai la software", "சென்னையில்"
  const cityMatch =
    transcript.match(/(?:live in|from|city is|oor|ooru|in|வசிப்பது|சொந்த ஊர்|ஊர்)\s+([A-Za-z\u0B80-\u0BFF]+)/i) ||
    transcript.match(/([A-Za-z\u0B80-\u0BFF]+)\s*(?:-la irukken|la irukken|la iruken|-la iruken|la|யில் இருக்கிறேன்|ல் இருக்கிறேன்)/i);
  if (cityMatch && cityMatch[1] && !["India", "Tamil", "English", "Software"].includes(cityMatch[1])) {
    fields.city = cityMatch[1].trim();
  } else {
    // Known Tamil Nadu cities lookup
    const tnCities = [
      "Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Trichy", "Salem", "Tirunelveli", "Erode", "Vellore",
      "Thanjavur", "Dindigul", "Tiruppur", "Kanchipuram", "Nagercoil", "Karur", "Ooty", "Hosur", "Puducherry", "Bangalore",
      "சென்னை", "கோவை", "கோயம்புத்தூர்", "மதுரை", "திருச்சி", "சேலம்", "ஈரோடு", "வேலூர்", "தஞ்சாவூர்"
    ];
    for (const c of tnCities) {
      if (new RegExp(`\\b${c}\\b`, "i").test(transcript) || transcript.includes(c)) {
        fields.city = c;
        break;
      }
    }
  }

  // Address
  const addrMatch = transcript.match(/(?:address is|mugavari|residential address is|முகவரி)\s+([^,.\n]+)/i);
  if (addrMatch && addrMatch[1]) {
    fields.address = addrMatch[1].trim();
  }

  // Pincode: 6 digits
  const pinMatch =
    transcript.match(/(?:pincode|pin|அஞ்சல் குறியீடு|postal code)\s*(?:is)?\s*([1-9]\d{5})/i) ||
    transcript.match(/\b([1-9]\d{5})\b/);
  if (pinMatch && pinMatch[1]) {
    fields.pincode = normalizeFieldValue("pincode", pinMatch[1]);
  }

  // Occupation
  const occMatch =
    transcript.match(/(?:work as a|work as an|working as|profession is|velai|job is|occupation is|வேலை|தொழில்)\s+([a-zA-Z\u0B80-\u0BFF\s]{3,35})(?:ah|\.|$|,|and)/i) ||
    transcript.match(/([a-zA-Z\s]{3,35})\s+(?:ah work panren|ah velai paakren|ah irukken|ah velai seigiren)/i) ||
    transcript.match(/software engineer/i) ||
    transcript.match(/மென்பொருள் பொறியாளர்/i);
  if (occMatch) {
    fields.occupation = occMatch[1] ? occMatch[1].trim() : (transcript.includes("மென்பொருள்") ? "மென்பொருள் பொறியாளர்" : "Software Engineer");
  }

  // College / Institution
  const collegeMatch = transcript.match(/(?:college|institution|university|padikiren|college is|படிக்கிறேன்)\s+(?:is\s+)?([A-Za-z\u0B80-\u0BFF\s]{3,40}(?:College|University|Institute)?)/i);
  if (collegeMatch && collegeMatch[1]) {
    fields.college = collegeMatch[1].trim();
  }

  // Degree / Qualification
  const degMatch = transcript.match(/(?:degree|studying|course|padikkiren|qualification is)\s+([A-Za-z.\s]{2,35})/i) ||
    transcript.match(/\b(B\.E\.|B\.Tech|B\.Com|M\.Sc|B\.Sc|MCA|MBA|BBA|BCA)\b/i);
  if (degMatch) {
    fields.degree = degMatch[1] ? degMatch[1].trim() : "B.E. Computer Science & Engineering";
    fields.qualification = fields.degree;
  }

  // Aadhaar / ID (12 digits or 4-digit groups)
  const aadhaarMatch = transcript.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/) || transcript.match(/\b(\d{12})\b/);
  if (aadhaarMatch) {
    fields.aadhaar = aadhaarMatch[1].replace(/\s/g, "");
    fields.idNumber = fields.aadhaar;
  }

  // Experience
  const expMatch = transcript.match(/(\d{1,2})\s*(?:years? of experience|years? experience|varusham experience|வருட அனுபவம்)/i);
  if (expMatch) {
    fields.experience = expMatch[1];
  }

  // Scholarship & Declaration
  if (/\b(?:scholarship|first graduate|mudhal thalaimurai|agree|certify|ஒப்புக்கொள்கிறேன்)\b/i.test(transcript)) {
    fields.scholarship = "true";
    fields.declaration = "true";
  }

  // Final normalization pass across all fields
  for (const k of Object.keys(fields)) {
    if (fields[k]) {
      fields[k] = normalizeFieldValue(k, fields[k]);
    }
  }

  return fields;
}

async function errorText(res: Response) {
  const t = await res.text();
  try {
    const j = JSON.parse(t);
    return j?.error?.message || j?.message || t;
  } catch {
    return t;
  }
}

export const Route = createFileRoute("/api/voice-fill")({
  server: {
    handlers: {
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      },
      POST: async ({ request }) => {
        const len = Number(request.headers.get("content-length") || 0);
        if (len > MAX_BYTES) return json({ error: "Payload exceeds size limit." }, 413);

        const contentType = request.headers.get("content-type") || "";
        let file: any = null;
        let existingTranscript: string | null = null;
        let language = "english";
        let detectedFields: Array<{ id: string; label: string; type?: string }> | null = null;

        if (contentType.includes("application/json")) {
          const body = (await request.json().catch(() => ({}))) as any;
          existingTranscript = body.transcript ? String(body.transcript) : null;
          language = String(body.language || "english");
          if (Array.isArray(body.detectedFields) && body.detectedFields.length > 0) {
            detectedFields = body.detectedFields;
          }
        } else {
          const form = await request.formData();
          file = form.get("file");
          existingTranscript = form.get("transcript") ? String(form.get("transcript")) : null;
          language = String(form.get("language") || "english");
          const rawDetected = form.get("detectedFields");
          if (typeof rawDetected === "string") {
            try {
              const parsed = JSON.parse(rawDetected);
              if (Array.isArray(parsed) && parsed.length > 0) detectedFields = parsed;
            } catch {}
          }
        }

        const hint = LANG_HINTS[language] ?? LANG_HINTS["english"]!;

        // Mode 1: Text-only re-extraction without re-recording audio
        if (existingTranscript && (!file || !(file instanceof File))) {
          const geminiKey = readEnvVar("GEMINI_API_KEY") || readEnvVar("VITE_GEMINI_API_KEY");
          if (geminiKey) {
            try {
              const fieldsPrompt =
                detectedFields && detectedFields.length > 0
                  ? `Extract values for these detected form fields:
${detectedFields.map((f) => `- "${f.id}": ${f.label} (${f.type || "text"})`).join("\n")}
Return ONLY valid JSON matching: {"transcript": "${existingTranscript}", "fields": {${detectedFields.map((f) => `"${f.id}": "extracted value or null"`).join(", ")}}}`
                  : `Extract the fields into JSON with keys: fullName, age, gender, dateOfBirth, phone, email, address, city, pincode, occupation.
Return ONLY valid JSON matching: {"transcript": "${existingTranscript}", "fields": {...}}`;

              const modelsToTry = [
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-flash-latest",
                "gemini-flash-lite-latest",
                "gemini-pro-latest",
              ];
              for (const model of modelsToTry) {
                try {
                  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: "POST",
                    headers: {
                      "x-goog-api-key": geminiKey,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      contents: [
                        {
                          role: "user",
                          parts: [
                            {
                              text: `You are MozhiFill AI. Extract personal form details from the transcript below.
Transcript: "${existingTranscript}"
Spoken context: ${hint.prompt}
${fieldsPrompt}`,
                            },
                          ],
                        },
                      ],
                      generationConfig: { responseMimeType: "application/json" },
                    }),
                  });

                  if (res.ok) {
                    const data = await res.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      const parsed = JSON.parse(text);
                      if (detectedFields && detectedFields.length > 0) {
                        const rawF = parsed?.fields || parsed || {};
                        const customF: Record<string, string | null> = {};
                        for (const df of detectedFields) {
                          const val = rawF[df.id] ?? rawF[df.label] ?? null;
                          customF[df.id] = normalizeFieldValue(df.id, val);
                        }
                        const fallbackMap = mapToDetectedFields(rawF, detectedFields);
                        for (const df of detectedFields) {
                          if (!customF[df.id] && fallbackMap[df.id]) {
                            customF[df.id] = normalizeFieldValue(df.id, fallbackMap[df.id]);
                          }
                        }
                        return json({ transcript: existingTranscript, fields: customF });
                      }
                      return json(sanitizeResult({ transcript: existingTranscript, ...parsed }));
                    }
                  }
                } catch {
                  continue;
                }
              }
            } catch (err) {
              console.warn("Text extraction with Gemini failed, falling back to heuristic", err);
            }
          }
          // Heuristic fallback for text extraction
          const fallbackFields = heuristicExtract(existingTranscript);
          if (detectedFields && detectedFields.length > 0) {
            return json({ transcript: existingTranscript, fields: mapToDetectedFields(fallbackFields, detectedFields) });
          }
          return json({ transcript: existingTranscript, fields: fallbackFields });
        }

        // Mode 2: Audio File Processing
        if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) {
          return json({ error: "Please record audio or provide a transcript." }, 400);
        }

        // Securely load Gemini API key strictly on the backend
        const geminiKey = readEnvVar("GEMINI_API_KEY") || readEnvVar("VITE_GEMINI_API_KEY");

        if (geminiKey) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await processWithGemini(geminiKey, arrayBuffer, file.type || "audio/wav", language, detectedFields);
            if (!result.transcript) {
              return json({ error: "No speech detected. Please speak clearly and try again." }, 422);
            }
            if (detectedFields && detectedFields.length > 0) {
              const mapped = mapToDetectedFields(result.fields, detectedFields);
              const merged: Record<string, string | null> = { ...result.fields };
              for (const df of detectedFields) {
                merged[df.id] = normalizeFieldValue(df.id, result.fields[df.id] || mapped[df.id] || null);
              }
              return json({
                transcript: result.transcript,
                fields: merged,
              });
            }
            return json(result);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn("Gemini processing note:", msg);
            if (existingTranscript) {
              const fallbackFields = heuristicExtract(existingTranscript);
              if (detectedFields && detectedFields.length > 0) {
                return json({ transcript: existingTranscript, fields: mapToDetectedFields(fallbackFields, detectedFields) });
              }
              return json({ transcript: existingTranscript, fields: fallbackFields });
            }
            return json({ error: msg }, 500);
          }
        }

        // Optional fallback: Standard OpenAI API if OPENAI_API_KEY is configured
        const openaiKey = readEnvVar("OPENAI_API_KEY");
        if (openaiKey) {
          const tf = new FormData();
          tf.append("model", "whisper-1");
          tf.append("file", file, file.name || "recording.wav");
          tf.append("response_format", "json");
          tf.append("prompt", hint.prompt);
          for (const l of hint.languages) tf.append("language", l);
          const tRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}` },
            body: tf,
          });
          if (!tRes.ok) return json({ error: await errorText(tRes) }, tRes.status);
          const tJson = (await tRes.json()) as { text?: string };
          const transcript = (tJson.text || "").trim();
          if (!transcript) return json({ error: "No speech detected. Please try again." }, 422);

          const extractPrompt =
            "You extract personal form details from a spoken transcript in English, Tamil, or Tanglish. " +
            "Understand Tamil words (e.g. peru/பெயர்=name, vayasu/வயது=age, oor/ஊர்=city, velai/வேலை=occupation, aan/ஆண்=Male, pen/பெண்=Female, mobile number, mugavari/முகவரி=address). " +
            "Return values in English / Roman script. Names: transliterate to English letters. Phone: digits only. " +
            "Age: number as string. dateOfBirth: YYYY-MM-DD. gender: Male, Female or Other. email: lowercase. Use null when a detail is not mentioned. Never invent data. Return JSON with 'fields' object containing fullName, age, gender, dateOfBirth, phone, email, address, city, pincode, occupation.";

          const eRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: extractPrompt },
                { role: "user", content: transcript },
              ],
              response_format: { type: "json_object" },
            }),
          });
          if (!eRes.ok) return json({ error: await errorText(eRes), transcript }, eRes.status);
          const eJson = (await eRes.json()) as any;
          const text = eJson?.choices?.[0]?.message?.content || "{}";
          let rawParsed: any = {};
          try {
            rawParsed = JSON.parse(text);
          } catch {
            return json({ error: "Could not understand the details. Please try again.", transcript }, 422);
          }
          const rawFields = rawParsed.fields || rawParsed;
          const fields: Record<string, string | null> = {};
          for (const f of FIELDS) {
            fields[f] = normalizeFieldValue(f, rawFields[f] !== undefined ? rawFields[f] : null);
          }
          return json({ transcript, fields });
        }

        return json(
          {
            error:
              "Gemini API is not configured on the server. Please set GEMINI_API_KEY in your backend .env file.",
          },
          500
        );
      },
    },
  },
});


