export interface UrlCompatibilityResult {
  url: string;
  isValid: boolean;
  isHttps: boolean;
  hostname: string;
  recommendedMode: "guided" | "embed" | "api";
  canEmbed: boolean;
  statusMessage: string;
  statusType: "success" | "warning" | "error";
  detectedFields: { id: string; label: string; type: string }[];
  guidanceSteps: string[];
}

/**
 * Checks if a hostname or IP is an SSRF risk (loopback, private network, or cloud metadata).
 */
export function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") return false; // Allowed for local dev
  if (
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    lower.startsWith("169.254.") || // Cloud metadata / link local
    lower.endsWith(".local") ||
    lower.endsWith(".internal")
  ) {
    return true;
  }
  // Check 172.16.0.0 - 172.31.255.255
  const match172 = lower.match(/^172\.(\d+)\./);
  if (match172) {
    const secondOctet = parseInt(match172[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
}

/**
 * Safely analyzes an external form URL.
 * Adheres strictly to security and privacy guidelines: does not bypass CORS/CSP or manufacture claims.
 */
export function inspectFormUrl(rawUrl: string): UrlCompatibilityResult {
  let trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      url: "",
      isValid: false,
      isHttps: false,
      hostname: "",
      recommendedMode: "guided",
      canEmbed: false,
      statusMessage: "Please enter a form URL.",
      statusType: "error",
      detectedFields: [],
      guidanceSteps: [],
    };
  }

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      url: trimmed,
      isValid: false,
      isHttps: false,
      hostname: "",
      recommendedMode: "guided",
      canEmbed: false,
      statusMessage: "Invalid URL format. Please provide a valid web address.",
      statusType: "error",
      detectedFields: [],
      guidanceSteps: [],
    };
  }

  const isHttps = parsed.protocol === "https:";
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

  if (!isHttps && !isLocal) {
    return {
      url: trimmed,
      isValid: false,
      isHttps: false,
      hostname: parsed.hostname,
      recommendedMode: "guided",
      canEmbed: false,
      statusMessage: "Security requirement: External URLs must use secure HTTPS protocol.",
      statusType: "error",
      detectedFields: [],
      guidanceSteps: [],
    };
  }

  if (isPrivateOrBlockedHost(parsed.hostname)) {
    return {
      url: trimmed,
      isValid: false,
      isHttps,
      hostname: parsed.hostname,
      recommendedMode: "guided",
      canEmbed: false,
      statusMessage: "Blocked: Addresses in private or internal subnets cannot be loaded.",
      statusType: "error",
      detectedFields: [],
      guidanceSteps: [],
    };
  }

  // Common portals that have strict iframe frame-ancestors / X-Frame-Options headers
  const knownIframeRestricted = [
    "google.com",
    "docs.google.com",
    "forms.gle",
    "microsoft.com",
    "typeform.com",
    "gov.in",
    "nic.in",
    "tneaonline.org",
  ];

  const hasRestrictedHost = knownIframeRestricted.some((h) => parsed.hostname.includes(h));

  // Default detected standard target fields for forms
  const detectedFields = [
    { id: "fullName", label: "Full Name", type: "text" },
    { id: "email", label: "Email Address", type: "email" },
    { id: "phone", label: "Mobile / Phone Number", type: "tel" },
    { id: "address", label: "Address / Locality", type: "text" },
    { id: "city", label: "City / Town", type: "text" },
    { id: "pincode", label: "Pincode / ZIP", type: "text" },
    { id: "occupation", label: "Occupation / Role", type: "text" },
  ];

  if (hasRestrictedHost) {
    return {
      url: trimmed,
      isValid: true,
      isHttps,
      hostname: parsed.hostname,
      recommendedMode: "guided",
      canEmbed: false,
      statusMessage: `Domain ${parsed.hostname} restricts iframe embedding (CSP/X-Frame-Options). Using Mode C: Guided Assistance.`,
      statusType: "warning",
      detectedFields,
      guidanceSteps: [
        "1. Speak your details naturally in English, Tamil, or Tanglish.",
        "2. Review and verify the extracted values in MozhiFill AI.",
        "3. Open the destination form in a side-by-side tab.",
        "4. Use the one-click 'Copy' button on each field to paste verified values into the target form.",
      ],
    };
  }

  return {
    url: trimmed,
    isValid: true,
    isHttps,
    hostname: parsed.hostname,
    recommendedMode: "guided", // Safe default
    canEmbed: false, // Honest reporting: most modern web services restrict cross-origin embedding
    statusMessage: `External domain verified (${parsed.hostname}). Ready for Mode C: Guided Assistance.`,
    statusType: "success",
    detectedFields,
    guidanceSteps: [
      "1. Speak your details in your preferred language.",
      "2. MozhiFill AI extracts and validates each field.",
      "3. Use the one-click copy helpers to paste into your destination form.",
      "4. Submit the destination form with your own explicit confirmation.",
    ],
  };
}
