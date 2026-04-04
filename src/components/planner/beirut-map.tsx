"use client";

import * as turf from "@turf/turf";
import type { FeatureCollection } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMemo } from "react";
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapMouseEvent,
} from "react-map-gl/mapbox";

export type LayerVisibility = {
  roads: boolean;
  buildings: boolean;
  poi: boolean;
  green: boolean;
  coast: boolean;
  transit: boolean;
};

const emptyFc: FeatureCollection = { type: "FeatureCollection", features: [] };

export function BeirutMap({
  token,
  lat,
  lng,
  zoom,
  radiusM,
  geojson,
  layers,
  onSelectLngLat,
}: {
  token: string | null;
  lat: number;
  lng: number;
  zoom: number;
  radiusM: number;
  geojson: FeatureCollection | null;
  layers: LayerVisibility;
  onSelectLngLat: (lng: number, lat: number) => void;
}) {
  const studyArea = useMemo(() => {
    return turf.circle([lng, lat], radiusM / 1000, {
      steps: 64,
      units: "kilometers",
    });
  }, [lng, lat, radiusM]);

  const data = geojson ?? emptyFc;

  if (!token) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/40 p-6 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">
          Add <code className="rounded bg-muted px-1 py-0.5 text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
          to enable the interactive map. Search, analysis, and metrics still work once coordinates are set.
        </p>
      </div>
    );
  }

  return (
    <Map
      key={`${lat.toFixed(5)}-${lng.toFixed(5)}`}
      mapboxAccessToken={token}
      initialViewState={{ longitude: lng, latitude: lat, zoom }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      onClick={(e: MapMouseEvent) => {
        const { lngLat } = e;
        if (lngLat) onSelectLngLat(lngLat.lng, lngLat.lat);
      }}
    >
      <NavigationControl position="top-right" />
      <Source id="study-area" type="geojson" data={studyArea}>
        <Layer
          id="study-fill"
          type="fill"
          paint={{
            "fill-color": "#1e3a5f",
            "fill-opacity": 0.12,
          }}
        />
        <Layer
          id="study-line"
          type="line"
          paint={{
            "line-color": "#1e3a5f",
            "line-width": 2,
            "line-opacity": 0.85,
          }}
        />
      </Source>
      <Source id="osm-context" type="geojson" data={data}>
        {layers.coast ? (
          <Layer
            id="coast"
            type="line"
            filter={["==", ["get", "_category"], "coastline"]}
            paint={{ "line-color": "#0ea5e9", "line-width": 2 }}
          />
        ) : null}
        {layers.roads ? (
          <Layer
            id="roads"
            type="line"
            filter={["==", ["get", "_category"], "road"]}
            paint={{ "line-color": "#64748b", "line-width": 1.2, "line-opacity": 0.7 }}
          />
        ) : null}
        {layers.buildings ? (
          <Layer
            id="buildings"
            type="line"
            filter={["==", ["get", "_category"], "building"]}
            paint={{ "line-color": "#334155", "line-width": 0.8, "line-opacity": 0.55 }}
          />
        ) : null}
        {layers.green ? (
          <Layer
            id="green"
            type="line"
            filter={["==", ["get", "_category"], "green"]}
            paint={{ "line-color": "#16a34a", "line-width": 1.5, "line-opacity": 0.65 }}
          />
        ) : null}
        {layers.transit ? (
          <Layer
            id="transit"
            type="circle"
            filter={["==", ["get", "_category"], "transit"]}
            paint={{
              "circle-radius": 4,
              "circle-color": "#7c3aed",
              "circle-opacity": 0.85,
            }}
          />
        ) : null}
        {layers.poi ? (
          <Layer
            id="poi"
            type="circle"
            filter={["==", ["get", "_category"], "poi"]}
            paint={{
              "circle-radius": 3,
              "circle-color": "#c2410c",
              "circle-opacity": 0.75,
            }}
          />
        ) : null}
      </Source>
      <Source
        id="site-pin"
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [lng, lat] },
            },
          ],
        }}
      >
        <Layer
          id="pin"
          type="circle"
          paint={{
            "circle-radius": 7,
            "circle-color": "#0f172a",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#fff",
          }}
        />
      </Source>
    </Map>
  );
}
