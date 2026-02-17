/**
 * MapLibre GL JS map engine.
 * Manages the base map, sources, and layer switching.
 */
import maplibregl from 'maplibre-gl';

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const SOURCE_ID = 'observations';

let map = null;
let currentLayerModule = null;
let currentData = null;

/**
 * Initialize the map in the given container element.
 */
export function initMap(container) {
  map = new maplibregl.Map({
    container,
    style: BASEMAP_STYLE,
    center: [-98.5, 39.8], // Center of US
    zoom: 3,
    maxZoom: 18,
    minZoom: 1,
    cancelPendingTileRequestsWhileZooming: true,
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: true
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

  return new Promise((resolve) => {
    map.once('load', () => resolve(map));
  });
}

/**
 * Get the map instance.
 */
export function getMap() {
  return map;
}

/**
 * Set the observation GeoJSON data on the map source.
 * If source doesn't exist yet, it will be created by the active layer module.
 */
export function setData(geojson) {
  currentData = geojson;
  if (map.getSource(SOURCE_ID)) {
    map.getSource(SOURCE_ID).setData(geojson);
  }
  return geojson;
}

/**
 * Get the current data.
 */
export function getData() {
  return currentData;
}

/**
 * Get the source ID used for observations.
 */
export function getSourceId() {
  return SOURCE_ID;
}

/**
 * Fit the map bounds to the current data extent.
 */
export function fitToData(geojson) {
  const data = geojson || currentData;
  if (!data || !data.features || data.features.length === 0) return;

  const bounds = new maplibregl.LngLatBounds();
  for (const f of data.features) {
    if (f.geometry && f.geometry.coordinates) {
      bounds.extend(f.geometry.coordinates);
    }
  }

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 1000 });
  }
}

/**
 * Switch the active layer type. Removes old layers and adds new ones.
 */
export async function setLayerType(layerModule, colorBy) {
  // Remove current layers
  if (currentLayerModule && currentLayerModule.remove) {
    currentLayerModule.remove(map, SOURCE_ID);
  }

  currentLayerModule = layerModule;

  // Add new layers
  if (currentLayerModule && currentData) {
    currentLayerModule.add(map, SOURCE_ID, currentData, colorBy);
  }
}

/**
 * Update the colorBy property on the current layer.
 */
export function updateColorBy(colorBy) {
  if (currentLayerModule && currentLayerModule.updateColorBy && currentData) {
    currentLayerModule.updateColorBy(map, SOURCE_ID, currentData, colorBy);
  }
}

/**
 * Get unique values for a property from the current data.
 */
export function getUniqueValues(property) {
  if (!currentData || !currentData.features) return [];
  const values = new Set();
  for (const f of currentData.features) {
    if (f.properties && f.properties[property]) {
      values.add(f.properties[property]);
    }
  }
  return [...values].sort();
}
