/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module 'leaflet.heat' {
  import * as L from 'leaflet';

  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: [number, number, number][]): this;
    addLatLng(latlng: [number, number, number]): this;
    setOptions(options: HeatLayerOptions): this;
  }

  function heatLayer(
    latlngs: [number, number, number][],
    options?: HeatLayerOptions
  ): HeatLayer;
}

declare namespace L {
  interface HeatLayer extends L.Layer {
    setLatLngs(latlngs: [number, number, number][]): this;
    addLatLng(latlng: [number, number, number]): this;
  }

  function heatLayer(
    latlngs: [number, number, number][],
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    }
  ): HeatLayer;
}
