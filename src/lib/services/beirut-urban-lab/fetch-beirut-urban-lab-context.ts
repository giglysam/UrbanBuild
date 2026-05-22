import "server-only";

import { getServerEnv } from "@/env/server";
import {
  arcgisCountInBuffer,
  arcgisFeatureAtPoint,
} from "@/lib/services/beirut-urban-lab/arcgis-rest";
import type { BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import {
  BBED_FEATURE_SERVER_URL,
  BEIRUT_URBAN_LAB_EXPLORE_APP_URL,
  BEIRUT_URBAN_LAB_HUB_URL,
} from "@/lib/types/beirut-urban-lab";

/** Layer indices on BBBED_2024_DataSharing FeatureServer (hub web map). */
const BBED_LAYER = {
  commercialGroundFloor: 1,
  solarPanelRooftop: 2,
  landmarks: 3,
  parkingEmptyLots: 4,
  garden: 5,
  river: 6,
  buildings: 7,
  mohafaza: 8,
  kadaa: 9,
  cadastral: 10,
} as const;

const ICIL = {
  buildingsPoly: "https://icilgis.aub.edu.lb/server/rest/services/BuildingsPoly/MapServer/0",
  districts: "https://icilgis.aub.edu.lb/server/rest/services/Districts_AOI/MapServer/0",
  municipalities: "https://icilgis.aub.edu.lb/server/rest/services/Municipalities_AOI/MapServer/0",
} as const;

function layerUrl(base: string, layerId: number): string {
  return `${base}/${layerId}`;
}

function hubReferer(): string {
  return getServerEnv().BEIRUT_URBAN_LAB_REFERER ?? BEIRUT_URBAN_LAB_HUB_URL;
}

function pickString(attrs: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = attrs[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Fetch Beirut Urban Lab / BBED (+ optional AUB ICIL) data for a study pin and radius.
 * Uses public ArcGIS REST services referenced by the hub explore app.
 */
export async function fetchBeirutUrbanLabContext(
  lat: number,
  lng: number,
  radiusM: number,
): Promise<BeirutUrbanLabContext | null> {
  const referer = hubReferer();

  const [buildings, gardens, parking, rivers, commercial, solar, landmarks, kadaaAttrs, mohafazaAttrs, cadastralAttrs] =
    await Promise.all([
      arcgisCountInBuffer(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.buildings), lat, lng, radiusM),
      arcgisCountInBuffer(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.garden), lat, lng, radiusM),
      arcgisCountInBuffer(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.parkingEmptyLots), lat, lng, radiusM),
      arcgisCountInBuffer(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.river), lat, lng, radiusM),
      arcgisCountInBuffer(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.commercialGroundFloor), lat, lng, radiusM),
      arcgisCountInBuffer(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.solarPanelRooftop), lat, lng, radiusM),
      arcgisCountInBuffer(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.landmarks), lat, lng, radiusM),
      arcgisFeatureAtPoint(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.kadaa), lat, lng, "EnglishName,KadaaID,Mohafaza,ArabicName"),
      arcgisFeatureAtPoint(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.mohafaza), lat, lng, "EnglishName,MohafazaID,ArabicName"),
      arcgisFeatureAtPoint(layerUrl(BBED_FEATURE_SERVER_URL, BBED_LAYER.cadastral), lat, lng, "EnglishName,ArabicName,CadastralID,Kadaa,Mohafaza"),
    ]);

  if (
    buildings == null &&
    gardens == null &&
    parking == null &&
    kadaaAttrs == null
  ) {
    return null;
  }

  const icilBuildings = await arcgisCountInBuffer(ICIL.buildingsPoly, lat, lng, radiusM, referer);
  const icilDistrict = await arcgisFeatureAtPoint(ICIL.districts, lat, lng, "Name,name,NAME,DISTRICT", referer);
  const icilMunicipality = await arcgisFeatureAtPoint(
    ICIL.municipalities,
    lat,
    lng,
    "Name,name,NAME",
    referer,
  );

  const bbedBuildingCount = buildings ?? 0;
  const notes: string[] = [
    "Beirut Built Environment Database (BBED 2024) — surveyed building stock and land-use layers from the Beirut Urban Lab open data platform.",
  ];

  if (icilBuildings != null) {
    notes.push(
      `AUB ICIL BuildingsPoly: ${icilBuildings} polygon features in buffer (institutional GIS; may differ from BBED survey counts).`,
    );
  }

  const adminAtPin = {
    mohafaza:
      pickString(mohafazaAttrs ?? {}, ["EnglishName", "Mohafaza"]) ??
      pickString(kadaaAttrs ?? {}, ["Mohafaza"]) ??
      pickString(cadastralAttrs ?? {}, ["Mohafaza"]),
    kadaa:
      pickString(kadaaAttrs ?? {}, ["EnglishName", "Kadaa"]) ??
      pickString(cadastralAttrs ?? {}, ["Kadaa"]),
    cadastralId:
      typeof cadastralAttrs?.CadastralID === "number"
        ? cadastralAttrs.CadastralID
        : undefined,
    cadastralEnglishName: pickString(cadastralAttrs ?? {}, ["EnglishName", "ArabicName"]),
  };

  return {
    source: "Beirut Urban Lab Open Data Platform",
    hubUrl: BEIRUT_URBAN_LAB_HUB_URL,
    exploreAppUrl: BEIRUT_URBAN_LAB_EXPLORE_APP_URL,
    featureServerUrl: BBED_FEATURE_SERVER_URL,
    studyRadiusMeters: radiusM,
    bbed: {
      buildings: bbedBuildingCount,
      gardens: gardens ?? 0,
      parkingAndEmptyLots: parking ?? 0,
      rivers: rivers ?? 0,
      commercialGroundFloor: commercial ?? 0,
      solarPanelRooftop: solar ?? 0,
      landmarks: landmarks ?? 0,
    },
    adminAtPin,
    icil:
      icilBuildings != null || icilDistrict != null || icilMunicipality != null
        ? {
            buildingsPoly: icilBuildings ?? undefined,
            districtName: pickString(icilDistrict ?? {}, ["Name", "name", "NAME", "DISTRICT"]),
            municipalityName: pickString(icilMunicipality ?? {}, ["Name", "name", "NAME"]),
          }
        : undefined,
    notes,
    fetchedAt: new Date().toISOString(),
  };
}
