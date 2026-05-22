/**
 * OSM feature categories fetched via Overpass for site feasibility (study buffer).
 * @see https://wiki.openstreetmap.org/wiki/Overpass_API
 */

export const OSM_SITE_CATEGORIES = [
  "buildings",
  "roads",
  "parks_green",
  "schools",
  "hospitals",
  "religious",
  "parking",
  "public_transport",
  "commercial",
  "sports",
] as const;

export type OsmSiteCategory = (typeof OSM_SITE_CATEGORIES)[number];

export const OSM_CATEGORY_LABELS: Record<OsmSiteCategory, string> = {
  buildings: "Buildings",
  roads: "Roads",
  parks_green: "Parks / green space",
  schools: "Schools",
  hospitals: "Hospitals / clinics",
  religious: "Religious buildings",
  parking: "Parking",
  public_transport: "Public transport stops",
  commercial: "Commercial POIs",
  sports: "Sports facilities",
};

const SCHOOL_AMENITIES = new Set(["school", "kindergarten", "college", "university"]);
const HOSPITAL_AMENITIES = new Set(["hospital", "clinic", "doctors"]);
const RELIGIOUS_AMENITIES = new Set(["place_of_worship"]);
const RELIGIOUS_BUILDINGS = new Set(["church", "mosque", "chapel", "cathedral", "synagogue", "temple"]);
const PARK_LEISURE = new Set(["park", "garden", "nature_reserve", "playground"]);
const PARK_LANDUSE = new Set(["recreation_ground", "grass", "forest", "meadow", "village_green"]);
const PARK_NATURAL = new Set(["wood", "tree_row", "scrub"]);
const SPORTS_LEISURE = new Set([
  "stadium",
  "pitch",
  "sports_centre",
  "sports_center",
  "swimming_pool",
  "track",
  "fitness_centre",
  "fitness_center",
]);
const PUBLIC_TRANSPORT_HIGHWAY = new Set(["bus_stop", "bus_guideway"]);
const PUBLIC_TRANSPORT_RAILWAY = new Set([
  "station",
  "halt",
  "tram_stop",
  "subway_entrance",
  "stop",
]);
const PUBLIC_TRANSPORT_AMENITY = new Set([
  "bus_station",
  "ferry_terminal",
  "taxi",
  "bicycle_rental",
]);

const COMMERCIAL_AMENITIES = new Set([
  "restaurant",
  "cafe",
  "fast_food",
  "bar",
  "pub",
  "marketplace",
  "food_court",
  "bank",
  "atm",
  "pharmacy",
  "cinema",
  "theatre",
]);
const COMMERCIAL_OFFICE = new Set(["company", "yes", "government", "insurance", "estate_agent"]);
const COMMERCIAL_LANDUSE = new Set(["commercial", "retail"]);

type Tags = Record<string, string>;

function hasTag(t: Tags, key: string, values?: Set<string>): boolean {
  const v = t[key];
  if (v == null) return false;
  if (!values) return true;
  return values.has(v);
}

/**
 * Assign the primary OSM category for map layers and indicators.
 * Priority order resolves overlaps (e.g. school building → schools, not buildings).
 */
export function classifyOsmFeature(tags: Tags | undefined): OsmSiteCategory | null {
  if (!tags || Object.keys(tags).length === 0) return null;
  const t = tags;

  if (hasTag(t, "amenity", SCHOOL_AMENITIES) || t.building === "school" || t.building === "university") {
    return "schools";
  }
  if (hasTag(t, "amenity", HOSPITAL_AMENITIES)) return "hospitals";
  if (
    hasTag(t, "amenity", RELIGIOUS_AMENITIES) ||
    hasTag(t, "building", RELIGIOUS_BUILDINGS)
  ) {
    return "religious";
  }
  if (
    t.amenity === "parking" ||
    t.parking != null ||
    t.landuse === "parking" ||
    t.building === "parking"
  ) {
    return "parking";
  }
  if (
    hasTag(t, "highway", PUBLIC_TRANSPORT_HIGHWAY) ||
    hasTag(t, "railway", PUBLIC_TRANSPORT_RAILWAY) ||
    hasTag(t, "amenity", PUBLIC_TRANSPORT_AMENITY) ||
    t.public_transport != null
  ) {
    return "public_transport";
  }
  if (hasTag(t, "leisure", SPORTS_LEISURE) || t.sport != null) return "sports";
  if (
    hasTag(t, "leisure", PARK_LEISURE) ||
    hasTag(t, "landuse", PARK_LANDUSE) ||
    hasTag(t, "natural", PARK_NATURAL)
  ) {
    return "parks_green";
  }
  if (
    t.shop != null ||
    hasTag(t, "amenity", COMMERCIAL_AMENITIES) ||
    hasTag(t, "office", COMMERCIAL_OFFICE) ||
    hasTag(t, "landuse", COMMERCIAL_LANDUSE) ||
    t.building === "retail" ||
    t.building === "commercial"
  ) {
    return "commercial";
  }
  if (t.highway != null) return "roads";
  if (t.building != null || t["building:part"] != null) return "buildings";

  return null;
}

export function emptyCategoryCounts(): Record<OsmSiteCategory, number> {
  return {
    buildings: 0,
    roads: 0,
    parks_green: 0,
    schools: 0,
    hospitals: 0,
    religious: 0,
    parking: 0,
    public_transport: 0,
    commercial: 0,
    sports: 0,
  };
}
