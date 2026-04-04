export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export async function nominatimSearch(
  query: string,
  options?: { limit?: number },
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({
    q: `${q}, Beirut, Lebanon`,
    format: "json",
    limit: String(options?.limit ?? 6),
    addressdetails: "1",
  });
  const url = `${NOMINATIM}?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "UrbanBuildMVP/1.0 (urban planning demo)",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
  }[];
  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    displayName: r.display_name,
  }));
}

export async function mapboxForwardGeocode(
  query: string,
  token: string,
): Promise<GeocodeResult[]> {
  const q = encodeURIComponent(query.trim());
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${token}&proximity=35.5018,33.8938&country=LB&limit=6`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Mapbox geocode ${res.status}`);
  const data = (await res.json()) as {
    features: {
      center: [number, number];
      place_name: string;
    }[];
  };
  return (data.features ?? []).map((f) => ({
    lng: f.center[0],
    lat: f.center[1],
    displayName: f.place_name,
  }));
}
