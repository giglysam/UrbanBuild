"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

type UrbanMapProps = {
  mapboxToken: string;
  latitude: number;
  longitude: number;
  zoom?: number;
  onLocationChange: (lat: number, lng: number) => void;
};

export function UrbanMap({
  mapboxToken,
  latitude,
  longitude,
  zoom = 13,
  onLocationChange,
}: UrbanMapProps) {
  return (
    <Map
      mapboxAccessToken={mapboxToken}
      mapStyle="mapbox://styles/mapbox/light-v11"
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
      <Marker longitude={longitude} latitude={latitude} anchor="center" color="#1d4ed8" />
    </Map>
  );
}
