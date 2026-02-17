/**
 * Categorical colored points layer.
 * Each observation renders as a circle, colored by a GeoJSON property.
 */
import maplibregl from 'maplibre-gl';
import { buildColorMatch } from '../palette.js';

const LAYER_ID = 'obs-points';
const LAYER_HOVER_ID = 'obs-points-hover';

let popup = null;
let hoveredId = null;

export function add(map, sourceId, geojson, colorBy) {
  // Ensure source exists
  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
      generateId: true
    });
  } else {
    map.getSource(sourceId).setData(geojson);
  }

  const uniqueValues = getUniqueValues(geojson, colorBy);
  const colorExpr = buildColorMatch(colorBy, uniqueValues);

  map.addLayer({
    id: LAYER_ID,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        2, 2,
        8, 4,
        14, 8
      ],
      'circle-color': colorExpr,
      'circle-opacity': 0.85,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.4)'
    }
  });

  // Hover effect
  map.on('mouseenter', LAYER_ID, onMouseEnter);
  map.on('mouseleave', LAYER_ID, onMouseLeave);
  map.on('click', LAYER_ID, onClick);
}

export function remove(map, sourceId) {
  map.off('mouseenter', LAYER_ID, onMouseEnter);
  map.off('mouseleave', LAYER_ID, onMouseLeave);
  map.off('click', LAYER_ID, onClick);

  if (popup) { popup.remove(); popup = null; }
  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

export function updateColorBy(map, sourceId, geojson, colorBy) {
  const uniqueValues = getUniqueValues(geojson, colorBy);
  const colorExpr = buildColorMatch(colorBy, uniqueValues);
  if (map.getLayer(LAYER_ID)) {
    map.setPaintProperty(LAYER_ID, 'circle-color', colorExpr);
  }
}

function onMouseEnter(e) {
  const map = e.target;
  map.getCanvas().style.cursor = 'pointer';

  if (e.features.length > 0) {
    const f = e.features[0];
    const props = f.properties;

    const html = `
      <div class="popup-title">${props.taxon_name}</div>
      ${props.taxon_common_name ? `<div class="popup-common">${props.taxon_common_name}</div>` : ''}
      <div class="popup-meta">
        ${props.observer ? `Observer: ${props.observer}<br>` : ''}
        ${props.observed_on ? `Date: ${props.observed_on}<br>` : ''}
        ${props.quality_grade ? `Quality: ${props.quality_grade}` : ''}
      </div>
      <a class="popup-link" href="${props.uri}" target="_blank">View on iNaturalist</a>
    `;

    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
      .setLngLat(f.geometry.coordinates.slice())
      .setHTML(html)
      .addTo(map);
  }
}

function onMouseLeave(e) {
  const map = e.target;
  map.getCanvas().style.cursor = '';
  if (popup) { popup.remove(); popup = null; }
}

function onClick(e) {
  if (e.features.length > 0) {
    const uri = e.features[0].properties.uri;
    if (uri) window.open(uri, '_blank');
  }
}

function getUniqueValues(geojson, property) {
  const values = new Set();
  for (const f of geojson.features) {
    if (f.properties[property]) values.add(f.properties[property]);
  }
  return [...values].sort();
}
