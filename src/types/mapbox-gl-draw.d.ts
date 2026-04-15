declare module "@mapbox/mapbox-gl-draw" {
  import type { IControl, Map } from "mapbox-gl";
  import type { Feature, FeatureCollection } from "geojson";

  export default class MapboxDraw implements IControl {
    constructor(options?: Record<string, unknown>);
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    getAll(): FeatureCollection;
    add(geojson: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry): string[];
    deleteAll(): this;
  }
}
