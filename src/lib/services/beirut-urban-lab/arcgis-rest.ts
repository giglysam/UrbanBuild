import "server-only";

const DEFAULT_TIMEOUT_MS = 25_000;

export type ArcgisQueryParams = {
  layerUrl: string;
  geometry?: { x: number; y: number } | { rings: number[][][]; spatialReference?: { wkid: number } };
  geometryType?: "esriGeometryPoint" | "esriGeometryPolygon";
  distanceMeters?: number;
  spatialRel?: string;
  outFields?: string;
  returnCountOnly?: boolean;
  returnGeometry?: boolean;
  resultRecordCount?: number;
  where?: string;
  referer?: string;
};

export type ArcgisQueryResult = {
  count?: number;
  features?: { attributes: Record<string, unknown> }[];
  error?: string;
};

export async function arcgisLayerQuery(params: ArcgisQueryParams): Promise<ArcgisQueryResult> {
  const search = new URLSearchParams({ f: "json" });
  if (params.where) search.set("where", params.where);
  if (params.returnCountOnly) search.set("returnCountOnly", "true");
  if (params.returnGeometry === false) search.set("returnGeometry", "false");
  if (params.outFields) search.set("outFields", params.outFields);
  if (params.resultRecordCount != null) {
    search.set("resultRecordCount", String(params.resultRecordCount));
  }

  if (params.geometry) {
    search.set("geometry", JSON.stringify(params.geometry));
    search.set("geometryType", params.geometryType ?? "esriGeometryPoint");
    search.set("inSR", "4326");
    if ("x" in params.geometry && params.distanceMeters != null) {
      search.set("distance", String(params.distanceMeters));
      search.set("units", "esriSRUnit_Meter");
    }
    if (params.spatialRel) search.set("spatialRel", params.spatialRel);
    else if ("rings" in params.geometry) {
      search.set("spatialRel", "esriSpatialRelIntersects");
    }
  }

  const url = `${params.layerUrl.replace(/\/$/, "")}/query?${search.toString()}`;
  const headers: Record<string, string> = {};
  if (params.referer) headers.Referer = params.referer;

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const text = await res.text();
    const data = JSON.parse(text) as {
      count?: number;
      features?: { attributes: Record<string, unknown> }[];
      error?: { message?: string };
    };
    if (!res.ok || data.error) {
      return { error: data.error?.message ?? `ArcGIS HTTP ${res.status}` };
    }
    return {
      count: data.count,
      features: data.features?.map((f) => ({ attributes: f.attributes ?? {} })),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "ArcGIS query failed" };
  }
}

export async function arcgisCountInBuffer(
  layerUrl: string,
  lat: number,
  lng: number,
  radiusM: number,
  referer?: string,
): Promise<number | null> {
  const result = await arcgisLayerQuery({
    layerUrl,
    geometry: { x: lng, y: lat, spatialReference: { wkid: 4326 } },
    distanceMeters: radiusM,
    returnCountOnly: true,
    referer,
  });
  if (result.error) return null;
  return result.count ?? 0;
}

export async function arcgisFeatureAtPoint(
  layerUrl: string,
  lat: number,
  lng: number,
  outFields = "*",
  referer?: string,
): Promise<Record<string, unknown> | null> {
  const result = await arcgisLayerQuery({
    layerUrl,
    geometry: { x: lng, y: lat, spatialReference: { wkid: 4326 } },
    spatialRel: "esriSpatialRelIntersects",
    outFields,
    returnGeometry: false,
    resultRecordCount: 1,
    referer,
  });
  if (result.error || !result.features?.length) return null;
  return result.features[0].attributes;
}
