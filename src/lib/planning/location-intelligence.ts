/** Beirut metro bounding box (approximate) for coarse location inference. */
const BEIRUT_BBOX = { latMin: 33.75, latMax: 34.15, lngMin: 35.42, lngMax: 35.58 };

export type LocationIntelligenceInput = {
  lat: number;
  lng: number;
  userPlaceHint?: string;
  reverseGeocodeLabel?: string;
};

export function isLikelyBeirutMetro(lat: number, lng: number): boolean {
  return (
    lat >= BEIRUT_BBOX.latMin &&
    lat <= BEIRUT_BBOX.latMax &&
    lng >= BEIRUT_BBOX.lngMin &&
    lng <= BEIRUT_BBOX.lngMax
  );
}

/** Civic / heritage hints for well-known pins (expand as needed). */
function civicContextFromPlaceHint(hint: string): string[] {
  const h = hint.toLowerCase();
  const lines: string[] = [];
  if (h.includes("martyrs") && h.includes("square")) {
    lines.push(
      "Martyrs' Square: central Beirut civic space — high symbolic value, pedestrian-oriented public realm, heritage/archaeological sensitivity for any excavation (e.g. underground parking).",
    );
    lines.push(
      "Planning sensitivity: municipal and heritage review likely; traffic and security events affect access patterns.",
    );
  }
  if (h.includes("downtown") || h.includes("beirut central district") || h.includes("bcd")) {
    lines.push("Downtown / BCD: mixed civic-commercial core, high pedestrian activity, constrained parcel assembly.");
  }
  if (h.includes("corniche")) {
    lines.push("Corniche: coastal mobility corridor — account for humidity, salt exposure, and waterfront setbacks.");
  }
  return lines;
}

/** Structured location block for the model — interpret before asking intake questions. */
export function formatLocationIntelligence(input: LocationIntelligenceInput): string {
  const lines: string[] = [
    "LOCATION INTELLIGENCE (use in your opening — reverse-interpret the pin; do not ask the user to confirm city if inferable):",
    `Coordinates: ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`,
  ];

  if (input.userPlaceHint?.trim()) {
    lines.push(`User-named place: ${input.userPlaceHint.trim()}`);
    lines.push(...civicContextFromPlaceHint(input.userPlaceHint));
  }

  if (input.reverseGeocodeLabel?.trim()) {
    lines.push(`Reverse geocode: ${input.reverseGeocodeLabel.trim()}`);
  }

  if (isLikelyBeirutMetro(input.lat, input.lng)) {
    lines.push(
      "Inferred metro context: Beirut, Lebanon — dense coastal urban fabric, mixed OSM/BBED signals; official zoning and utilities are not in UrbanBuild datasets.",
    );
    if (!input.userPlaceHint?.trim()) {
      lines.push(
        "District: infer from reverse geocode or nearest landmark; state uncertainty if the pin sits between named quarters.",
      );
    }
  } else {
    lines.push(
      "Urban context: infer city/district from reverse geocode and user hints; describe density and access qualitatively until OSM buffer metrics load.",
    );
  }

  return lines.join("\n");
}
