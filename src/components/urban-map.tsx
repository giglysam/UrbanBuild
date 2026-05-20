"use client";

import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import { useMemo } from "react";
import Map, { Layer, Marker, NavigationControl, Source } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type UrbanMapProps = {
  mapboxToken: string;
  latitude: number;
  longitude: number;
  zoom?: number;
  mapStyleId?: "streets-v12" | "light-v11" | "dark-v11" | "satellite-streets-v12";
  routeGeojson?: unknown;
  isochroneGeojson?: unknown;
  poiGeojson?: unknown;
  onLocationChange: (lat: number, lng: number) => void;
};

export function UrbanMap({
  mapboxToken,
  latitude,
  longitude,
  zoom = 13,
  mapStyleId = "light-v11",
  routeGeojson,
  isochroneGeojson,
  poiGeojson,
  onLocationChange,
}: UrbanMapProps) {
  const routeData = useMemo(() => coerceFeatureCollection(routeGeojson), [routeGeojson]);
  const isochroneData = useMemo(() => coerceFeatureCollection(isochroneGeojson), [isochroneGeojson]);
  const poiData = useMemo(() => coerceFeatureCollection(poiGeojson), [poiGeojson]);

  return (
    <Map
      mapboxAccessToken={mapboxToken}
      mapStyle={`mapbox://styles/mapbox/${mapStyleId}`}
      initialViewState={{
        longitude,
        latitude,
        zoom,
      }}
      style={{ width: "100%", height: "100%" }}
      onClick={(e) => {
        const { lat, lng } = e.lngLat;
        onLocationChange(lat, lng);
      }}
    >
      <NavigationControl position="top-right" />
      {isochroneData ? (
        <Source id="isochrone-source" type="geojson" data={isochroneData}>
          <Layer
            id="isochrone-fill"
            type="fill"
            paint={{ "fill-color": "#22c55e", "fill-opacity": 0.18 }}
          />
          <Layer id="isochrone-line" type="line" paint={{ "line-color": "#16a34a", "line-width": 2 }} />
        </Source>
      ) : null}
      {routeData ? (
        <Source id="route-source" type="geojson" data={routeData}>
          <Layer id="route-line" type="line" paint={{ "line-color": "#2563eb", "line-width": 4 }} />
        </Source>
      ) : null}
      {poiData ? (
        <Source id="poi-source" type="geojson" data={poiData}>
          <Layer
            id="poi-circle"
            type="circle"
            paint={{ "circle-radius": 4, "circle-color": "#dc2626", "circle-stroke-width": 1, "circle-stroke-color": "#fff" }}
          />
        </Source>
      ) : null}
      <Marker longitude={longitude} latitude={latitude} anchor="center" color="#1d4ed8" />
    </Map>
  );
}

function coerceFeatureCollection(input: unknown): FeatureCollection<Geometry, GeoJsonProperties> | null {
  if (!input || typeof input !== "object") return null;
  const maybe = input as { type?: string; features?: unknown[] };
  if (maybe.type !== "FeatureCollection" || !Array.isArray(maybe.features)) return null;
  return maybe as FeatureCollection<Geometry, GeoJsonProperties>;
}
