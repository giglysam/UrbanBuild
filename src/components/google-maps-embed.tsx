"use client";

import { useMemo } from "react";

export type GoogleMapsEmbedProps = {
  /** Center the embed on these coordinates (WGS84). */
  lat: number;
  lng: number;
  /** Used for the iframe title and accessibility only. */
  placeLabel: string;
  /** `true` = satellite-style imagery (`t=k`), `false` = default roadmap-style embed. */
  satellite: boolean;
  zoom?: number;
  className?: string;
};

/**
 * Google Maps lazy-loaded iframe (no Maps JavaScript API key).
 * Satellite uses the common `t=k` map type parameter on the standard embed URL.
 */
export function GoogleMapsEmbed({
  lat,
  lng,
  placeLabel,
  satellite,
  zoom = 16,
  className,
}: GoogleMapsEmbedProps) {
  const src = useMemo(() => {
    const u = new URL("https://www.google.com/maps");
    u.searchParams.set("q", `${lat},${lng}`);
    u.searchParams.set("z", String(zoom));
    u.searchParams.set("output", "embed");
    if (satellite) u.searchParams.set("t", "k");
    return u.toString();
  }, [lat, lng, satellite, zoom]);

  return (
    <iframe
      title={`Google Maps — ${placeLabel}`}
      className={className}
      style={{ border: 0 }}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      src={src}
    />
  );
}
