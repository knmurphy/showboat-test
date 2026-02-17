/**
 * Heatmap layer.
 * Renders observation density. Transitions to circle points at higher zoom.
 * When colorBy is set, splits into multiple heatmap layers by category.
 */
import { buildColorMatch } from '../palette.js';

const LAYER_PREFIX = 'obs-heatmap';
const CIRCLE_LAYER_ID = 'obs-heatmap-circles';

// Color ramps for different categories (one per split)
const HEATMAP_RAMPS = [
  // Red
  ['rgba(255,0,0,0)', 'rgba(255,80,80,0.4)', 'rgba(255,0,0,0.7)', 'rgba(200,0,0,1)'],
  // Blue
  ['rgba(0,0,255,0)', 'rgba(80,80,255,0.4)', 'rgba(0,0,255,0.7)', 'rgba(0,0,200,1)'],
  // Green
  ['rgba(0,180,0,0)', 'rgba(80,220,80,0.4)', 'rgba(0,180,0,0.7)', 'rgba(0,140,0,1)'],
  // Purple
  ['rgba(150,0,200,0)', 'rgba(180,80,220,0.4)', 'rgba(150,0,200,0.7)', 'rgba(120,0,160,1)'],
  // Orange
  ['rgba(255,140,0,0)', 'rgba(255,180,80,0.4)', 'rgba(255,140,0,0.7)', 'rgba(200,100,0,1)'],
  // Cyan
  ['rgba(0,200,200,0)', 'rgba(80,220,220,0.4)', 'rgba(0,200,200,0.7)', 'rgba(0,160,160,1)'],
];

// Default single heatmap ramp
const DEFAULT_RAMP = [
  'interpolate', ['linear'], ['heatmap-density'],
  0, 'rgba(33,102,172,0)',
  0.2, 'rgb(103,169,207)',
  0.4, 'rgb(209,229,240)',
  0.6, 'rgb(253,219,199)',
  0.8, 'rgb(239,138,98)',
  1, 'rgb(178,24,43)'
];

let addedLayers = [];

export function add(map, sourceId, geojson, colorBy) {
  cleanup(map, sourceId);

  // Single heatmap (no split by category)
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson
    });
  } else {
    map.getSource(sourceId).setData(geojson);
  }

  const layerId = `${LAYER_PREFIX}-all`;
  map.addLayer({
    id: layerId,
    type: 'heatmap',
    source: sourceId,
    maxzoom: 15,
    paint: {
      'heatmap-weight': 1,
      'heatmap-intensity': [
        'interpolate', ['linear'], ['zoom'],
        0, 1, 9, 3
      ],
      'heatmap-color': DEFAULT_RAMP,
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 2, 9, 20, 14, 30
      ],
      'heatmap-opacity': [
        'interpolate', ['linear'], ['zoom'],
        7, 1, 14, 0.6
      ]
    }
  });
  addedLayers.push(layerId);

  // Also add circle layer for high zoom
  const uniqueValues = getUniqueValues(geojson, colorBy);
  const colorExpr = buildColorMatch(colorBy, uniqueValues);

  map.addLayer({
    id: CIRCLE_LAYER_ID,
    type: 'circle',
    source: sourceId,
    minzoom: 9,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        9, 2, 14, 6
      ],
      'circle-color': colorExpr,
      'circle-opacity': [
        'interpolate', ['linear'], ['zoom'],
        9, 0, 11, 0.8
      ],
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.3)'
    }
  });
  addedLayers.push(CIRCLE_LAYER_ID);
}

export function remove(map, sourceId) {
  cleanup(map, sourceId);
}

export function updateColorBy(map, sourceId, geojson, colorBy) {
  // Update the circle layer color
  const uniqueValues = getUniqueValues(geojson, colorBy);
  const colorExpr = buildColorMatch(colorBy, uniqueValues);
  if (map.getLayer(CIRCLE_LAYER_ID)) {
    map.setPaintProperty(CIRCLE_LAYER_ID, 'circle-color', colorExpr);
  }
}

function cleanup(map, sourceId) {
  for (const id of addedLayers) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  addedLayers = [];
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

function getUniqueValues(geojson, property) {
  const values = new Set();
  for (const f of geojson.features) {
    if (f.properties[property]) values.add(f.properties[property]);
  }
  return [...values].sort();
}
