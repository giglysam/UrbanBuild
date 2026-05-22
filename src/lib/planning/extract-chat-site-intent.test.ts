import { describe, expect, it } from "vitest";

import {
  extractChatSiteIntent,
  extractCustomProjectDescription,
  extractPlaceLabelFromText,
  extractProjectTypeFromText,
  normalizeLatLngPair,
  userMessageHasCoordinatesAndProject,
} from "./extract-chat-site-intent";

describe("extract-chat-site-intent", () => {
  it("detects football stadium and Beirut coordinates", () => {
    const intent = extractChatSiteIntent("Can I build a football stadium at 33.8866, 35.5012?");
    expect(intent.projectType).toBe("football_stadium");
    expect(intent.lat).toBeCloseTo(33.8866, 3);
    expect(intent.lng).toBeCloseTo(35.5012, 3);
    expect(intent.radiusM).toBe(400);
  });

  it("maps stadium to football_stadium", () => {
    expect(extractProjectTypeFromText("stadium at the port")).toBe("football_stadium");
  });

  it("detects radius in meters", () => {
    const intent = extractChatSiteIntent("School at 33.89, 35.50 within 500m");
    expect(intent.projectType).toBe("school");
    expect(intent.radiusM).toBe(500);
  });

  it("parses Martyrs Square green space with underground parking", () => {
    const msg =
      "I want to build a green space with underground parking at the martyrs square coordinates 33.89552, 35.50755";
    expect(userMessageHasCoordinatesAndProject(msg)).toBe(true);
    const intent = extractChatSiteIntent(msg);
    expect(intent.lat).toBeCloseTo(33.89552, 4);
    expect(intent.lng).toBeCloseTo(35.50755, 4);
    expect(intent.placeLabel).toBe("Martyrs' Square");
    expect(intent.projectType).toBe("public_park");
    expect(intent.customProjectDescription?.toLowerCase()).toContain("green space");
    expect(intent.customProjectDescription?.toLowerCase()).toContain("parking");
  });

  it("extracts place label from coordinates phrase", () => {
    expect(extractPlaceLabelFromText("study at martyrs square coordinates 33.89, 35.50")).toBe(
      "Martyrs' Square",
    );
  });

  it("extracts custom program from want to build clause", () => {
    const desc = extractCustomProjectDescription(
      "I want to build a green space with underground parking at the martyrs square coordinates 33.89552, 35.50755",
    );
    expect(desc?.toLowerCase()).toContain("green space");
  });
});

describe("normalizeLatLngPair", () => {
  it("keeps Beirut-style lat,lng order when both are valid latitudes", () => {
    expect(normalizeLatLngPair(33.8866, 35.5012)).toEqual({ lat: 33.8866, lng: 35.5012 });
  });

  it("swaps when first value is outside latitude range", () => {
    expect(normalizeLatLngPair(95, 50)).toEqual({ lat: 50, lng: 95 });
  });

  it("does not swap when only second value is a valid latitude", () => {
    expect(normalizeLatLngPair(35.5012, 33.8866)).toEqual({ lat: 35.5012, lng: 33.8866 });
  });
});
