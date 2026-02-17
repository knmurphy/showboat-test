/**
 * natura-map main entry point.
 * Wires together the map engine, UI, and data modules.
 */
import { initMap, getMap, setData, fitToData, setLayerType, updateColorBy, getUniqueValues } from './map/engine.js';
import { initSearch, triggerSearch } from './ui/search.js';
import { initQuickSelect } from './ui/quickselect.js';
import { initControls, getActiveLayerType, getActiveColorBy, initPaletteControl } from './ui/controls.js';
import { updateLegend, countValues } from './ui/legend.js';
import { setActivePalette } from './map/palette.js';
import { initExport } from './ui/export.js';

import * as pointsLayer from './map/layers/points.js';
import * as heatmapLayer from './map/layers/heatmap.js';
import * as clustersLayer from './map/layers/clusters.js';
import * as choroplethLayer from './map/layers/choropleth.js';

const LAYER_MODULES = {
  points: pointsLayer,
  heatmap: heatmapLayer,
  clusters: clustersLayer,
  choropleth: choroplethLayer
};

let currentGeojson = null;
let layerInitialized = false;
let firstFit = true;

async function main() {
  // Initialize the map
  const map = await initMap('map');

  function applyLayer() {
    const layerType = getActiveLayerType();
    const colorBy = getActiveColorBy();
    const layerModule = LAYER_MODULES[layerType];
    setLayerType(layerModule, colorBy);
  }

  function refreshLegend() {
    const colorBy = getActiveColorBy();
    const uniqueValues = getUniqueValues(colorBy);
    const counts = countValues(currentGeojson, colorBy);
    updateLegend(colorBy, uniqueValues, counts);
  }

  // Handle new data arriving (from search or presets)
  function onData(geojson) {
    currentGeojson = geojson;

    // Always update engine's currentData first
    setData(geojson);

    // On first data load or new search, rebuild layers
    if (!layerInitialized) {
      applyLayer();
      layerInitialized = true;
    }

    if (firstFit) {
      fitToData(geojson);
      firstFit = false;
    }

    refreshLegend();
  }

  // Initialize UI
  initSearch(onData);

  initQuickSelect((params) => {
    layerInitialized = false;
    firstFit = true;
    triggerSearch(params, onData);
  });

  initControls(
    // Layer type change
    (layerType) => {
      if (!currentGeojson) return;
      applyLayer();
    },
    // Color-by change
    (colorBy) => {
      if (!currentGeojson) return;
      updateColorBy(colorBy);
      const uniqueValues = getUniqueValues(colorBy);
      const counts = countValues(currentGeojson, colorBy);
      updateLegend(colorBy, uniqueValues, counts);
    }
  );

  initPaletteControl((paletteName) => {
    if (!currentGeojson) return;
    setActivePalette(paletteName);
    applyLayer();
    refreshLegend();
  });

  // Initialize export
  initExport(getMap);

  // Try loading pre-cached default data
  try {
    const res = await fetch('./data/default.geojson');
    if (res.ok) {
      const geojson = await res.json();
      if (geojson.features && geojson.features.length > 0) {
        onData(geojson);
      }
    }
  } catch {
    // No pre-cached data, that's fine — user will search
    console.log('No pre-cached data found, waiting for user search');
  }
}

main().catch(err => {
  console.error('natura-map init error:', err);
  document.title = 'ERROR: ' + err.message;
});
