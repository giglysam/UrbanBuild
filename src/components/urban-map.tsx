"use client";

import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";
import mapboxgl from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Source, type MapRef } from "react-map-gl/mapbox";
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

/** Run callback only when Mapbox has a style and canvas (avoids getCanvasContainer().appendChild errors). */
function whenMapStyleReady(map: mapboxgl.Map, onReady: () => void): () => void {
  const run = () => {
    if (!map.getCanvasContainer?.()) return;
    onReady();
  };
  if (map.isStyleLoaded()) {
    run();
    return () => {};
  }
  map.once("load", run);
  map.once("style.load", run);
  return () => {
    map.off("load", run);
    map.off("style.load", run);
  };
}

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
  const mapRef = useRef<MapRef>(null);
  const navControlRef = useRef<mapboxgl.NavigationControl | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const styleReadyCleanupRef = useRef<(() => void) | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const routeData = useMemo(() => coerceFeatureCollection(routeGeojson), [routeGeojson]);
  const isochroneData = useMemo(() => coerceFeatureCollection(isochroneGeojson), [isochroneGeojson]);
  const poiData = useMemo(() => coerceFeatureCollection(poiGeojson), [poiGeojson]);

  const detachNavControl = useCallback((map: mapboxgl.Map) => {
    if (!navControlRef.current) return;
    try {
      map.removeControl(navControlRef.current);
    } catch {
      /* map may already be destroyed */
    }
    navControlRef.current = null;
  }, []);

  const removeMarker = useCallback(() => {
    markerRef.current?.remove();
    markerRef.current = null;
  }, []);

  const attachNavControl = useCallback((map: mapboxgl.Map) => {
    if (navControlRef.current) return;
    const nav = new mapboxgl.NavigationControl({ visualizePitch: true });
    map.addControl(nav, "top-right");
    navControlRef.current = nav;
  }, []);

  const syncMarker = useCallback(
    (map: mapboxgl.Map) => {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#1d4ed8" })
          .setLngLat([longitude, latitude])
          .addTo(map);
      } else {
        markerRef.current.setLngLat([longitude, latitude]);
      }
    },
    [longitude, latitude],
  );

  const onMapLoad = useCallback(
    (evt: { target: mapboxgl.Map }) => {
      const map = evt.target;
      styleReadyCleanupRef.current?.();
      styleReadyCleanupRef.current = whenMapStyleReady(map, () => {
        attachNavControl(map);
        syncMarker(map);
        setMapReady(true);
      });
    },
    [attachNavControl, syncMarker],
  );

  const onMapRemove = useCallback(() => {
    styleReadyCleanupRef.current?.();
    styleReadyCleanupRef.current = null;
    const map = mapRef.current?.getMap();
    if (map) detachNavControl(map);
    removeMarker();
    setMapReady(false);
  }, [detachNavControl, removeMarker]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.jumpTo({ center: [longitude, latitude], zoom: map.getZoom() });
    if (markerRef.current) {
      markerRef.current.setLngLat([longitude, latitude]);
    }
  }, [mapReady, latitude, longitude]);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      mapStyle={`mapbox://styles/mapbox/${mapStyleId}`}
      initialViewState={{
        longitude,
        latitude,
        zoom,
      }}
      style={{ width: "100%", height: "100%" }}
      attributionControl={false}
      onLoad={onMapLoad}
      onRemove={onMapRemove}
      onClick={(e) => {
        const { lat, lng } = e.lngLat;
        onLocationChange(lat, lng);
      }}
    >
      {mapReady ? (
        <>
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
                paint={{
                  "circle-radius": 4,
                  "circle-color": "#dc2626",
                  "circle-stroke-width": 1,
                  "circle-stroke-color": "#fff",
                }}
              />
            </Source>
          ) : null}
        </>
      ) : null}
    </Map>
  );
}

function coerceFeatureCollection(input: unknown): FeatureCollection<Geometry, GeoJsonProperties> | null {
  if (!input || typeof input !== "object") return null;
  const maybe = input as { type?: string; features?: unknown[] };
  if (maybe.type !== "FeatureCollection" || !Array.isArray(maybe.features)) return null;
  return maybe as FeatureCollection<Geometry, GeoJsonProperties>;
}
