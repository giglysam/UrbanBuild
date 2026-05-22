import { DEFAULT_STUDY_RADIUS_M } from "@/lib/geo/site-buffer-metrics";
import type { ProjectTypeId } from "@/lib/types/site-feasibility";

export type ExtractedChatSiteIntent = {
  lat?: number;
  lng?: number;
  radiusM?: number;
  projectType?: ProjectTypeId;
  /** Full program phrase when the user describes a non-catalog or compound project. */
  customProjectDescription?: string;
  /** Place name from the user message (e.g. Martyrs' Square). */
  placeLabel?: string;
};

/** Longest phrases first so "football stadium" wins over "stadium". */
const PROJECT_PHRASES: { pattern: RegExp; type: ProjectTypeId }[] = [
  { pattern: /\bgreen\s+space\b/i, type: "public_park" },
  { pattern: /\bunderground\s+parking\b/i, type: "mixed_use_development" },
  { pattern: /\bsports\s+complex\b/i, type: "sports_complex" },
  { pattern: /\bmixed[-\s]?use\s+development\b/i, type: "mixed_use_development" },
  { pattern: /\bresidential\s+building\b/i, type: "residential_building" },
  { pattern: /\bcommunity\s+center\b/i, type: "community_center" },
  { pattern: /\bpublic\s+square\b/i, type: "public_square" },
  { pattern: /\bfootball\s+stadium\b/i, type: "football_stadium" },
  { pattern: /\bstadium\b/i, type: "football_stadium" },
  { pattern: /\bpublic\s+park\b/i, type: "public_park" },
  { pattern: /\bpark\b/i, type: "public_park" },
  { pattern: /\bschool\b/i, type: "school" },
  { pattern: /\bhospital\b/i, type: "hospital" },
  { pattern: /\bmall\b/i, type: "mall" },
  { pattern: /\bhousing\b/i, type: "residential_building" },
  { pattern: /\bhotel\b/i, type: "mixed_use_development" },
];

const NAMED_PLACE_ALIASES: { pattern: RegExp; label: string }[] = [
  { pattern: /\bmartyrs'?s?\s+square\b/i, label: "Martyrs' Square" },
  { pattern: /\bbeirut\s+downtown\b/i, label: "Beirut Downtown" },
  { pattern: /\bcentral\s+district\b/i, label: "Beirut Central District" },
];

/** Assign lat/lng from two numbers; swap only when one value is outside latitude range. */
export function normalizeLatLngPair(a: number, b: number): { lat: number; lng: number } | null {
  const aIsLat = Math.abs(a) <= 90;
  const bIsLat = Math.abs(b) <= 90;
  if (!aIsLat && !bIsLat) return null;
  if (aIsLat && !bIsLat) return { lat: a, lng: b };
  if (!aIsLat && bIsLat) return { lat: b, lng: a };
  return { lat: a, lng: b };
}

function parseCoordPair(text: string): { lat: number; lng: number } | null {
  const patterns = [
    /coordinates?\s*[:=]?\s*(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})/i,
    /(-?\d{1,2}\.\d{3,})\s*[,;\s]\s*(-?\d{1,3}\.\d{3,})/,
    /lat(?:itude)?\s*[:=]?\s*(-?\d{1,2}\.\d+)\s*[,;\s]+\s*lng(?:itude)?\s*[:=]?\s*(-?\d{1,3}\.\d+)/i,
    /(-?\d{1,2}\.\d+)\s*[,]\s*(-?\d{1,3}\.\d+)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const pair = normalizeLatLngPair(a, b);
    if (!pair) continue;
    const { lat, lng } = pair;
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

function parseRadiusM(text: string): number | undefined {
  const m =
    text.match(/\b(\d{2,4})\s*m(?:eter)?s?\b/i) ??
    text.match(/\bradius\s*(?:of)?\s*(\d{2,4})\b/i) ??
    text.match(/\bwithin\s*(\d{2,4})\s*m\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n >= 50 && n <= 2000) return n;
  return undefined;
}

export function extractPlaceLabelFromText(text: string): string | undefined {
  for (const { pattern, label } of NAMED_PLACE_ALIASES) {
    if (pattern.test(text)) return label;
  }
  const atPlace = text.match(
    /\bat\s+(?:the\s+)?([A-Za-zÀ-ÿ][\w\s'’.-]{2,48}?(?:square|plaza|quarter|district|neighborhood|area|site|port|zone))\b/i,
  );
  if (atPlace?.[1]) return atPlace[1].trim();
  const namedBeforeCoords = text.match(
    /([A-Za-z][\w\s'’.-]{3,40}?)\s+coordinates?\s*[:=]?\s*-?\d/i,
  );
  if (namedBeforeCoords?.[1]) {
    const candidate = namedBeforeCoords[1].trim();
    if (!/^(the|a|an|i|we)$/i.test(candidate)) return candidate;
  }
  return undefined;
}

/** Extract the proposed program phrase from build/want/propose clauses. */
export function extractCustomProjectDescription(text: string): string | undefined {
  const buildMatch = text.match(
    /\b(?:want to|wants to|i(?:'d| would) like to|planning to|plan to|propose(?:d)?|build|construct|develop|create)\s+(?:a|an)?\s*([^.;]+?)(?:\s+at\s+|\s+in\s+|\s+near\s+|,|\s+(?:at\s+)?(?:the\s+)?(?:martyrs|coordinates?)|\s+\d{2}\.\d)/i,
  );
  if (buildMatch?.[1]) {
    const phrase = buildMatch[1].trim().replace(/\s+/g, " ");
    if (phrase.length >= 8) return phrase.slice(0, 500);
  }
  if (/\bgreen\s+space\b/i.test(text) && /\b(underground\s+)?parking\b/i.test(text)) {
    return "Green public space with underground parking";
  }
  if (/\bgreen\s+space\b/i.test(text)) return "Green public space";
  return undefined;
}

export function extractProjectTypeFromText(text: string): ProjectTypeId | undefined {
  const lower = text.toLowerCase();
  for (const { pattern, type } of PROJECT_PHRASES) {
    if (pattern.test(lower)) return type;
  }
  return undefined;
}

export function userMessageImpliesProjectIntent(text: string): boolean {
  return (
    extractProjectTypeFromText(text) != null ||
    extractCustomProjectDescription(text) != null ||
    /\b(build|construct|develop|create|propose|feasib|parking|green\s+space|mixed[-\s]?use|housing|stadium|school|hospital|mall)\b/i.test(
      text,
    )
  );
}

export function userMessageHasCoordinatesAndProject(text: string): boolean {
  const coords = parseCoordPair(text);
  if (!coords) return false;
  return userMessageImpliesProjectIntent(text);
}

export function extractChatSiteIntent(text: string): ExtractedChatSiteIntent {
  const coords = parseCoordPair(text);
  const placeLabel = extractPlaceLabelFromText(text);
  const customProjectDescription = extractCustomProjectDescription(text);
  let projectType = extractProjectTypeFromText(text);

  if (!projectType && customProjectDescription) {
    projectType = "custom";
  } else if (
    projectType &&
    customProjectDescription &&
    customProjectDescription.length > 12 &&
    !customProjectDescription.toLowerCase().includes(projectType.replace(/_/g, " "))
  ) {
    /* compound program (e.g. green space + parking) — keep nearest type for scoring, retain full phrase */
  } else if (!projectType && userMessageImpliesProjectIntent(text) && coords) {
    projectType = "custom";
  }

  const radiusM = parseRadiusM(text) ?? DEFAULT_STUDY_RADIUS_M;
  return {
    lat: coords?.lat,
    lng: coords?.lng,
    radiusM: coords ? radiusM : undefined,
    projectType,
    customProjectDescription,
    placeLabel,
  };
}

export function userMessageImpliesFeasibilityQuestion(text: string): boolean {
  return /\b(can\s+i|could\s+i|is\s+it|feasib|build|construct|develop|propose|suitable|allowed)\b/i.test(
    text,
  );
}
