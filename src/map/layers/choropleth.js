/**
 * Choropleth layer.
 * Colors regions by observation count or species richness.
 * Uses Natural Earth country boundaries with proper point-in-polygon spatial join.
 */

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

const BOUNDARIES_SOURCE = 'ne-boundaries';
const CHOROPLETH_LAYER = 'obs-choropleth';
const BOUNDARIES_OUTLINE = 'obs-choropleth-outline';
const POINTS_SOURCE = 'obs-choropleth-points';

// Natural Earth 50m countries GeoJSON
const BOUNDARIES_URL = 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson';

let boundariesLoaded = false;
let cachedBoundaries = null;
let countByCountry = {};
let currentColorBy = null;
let currentGeojson = null;

/**
 * Fetch and cache Natural Earth boundaries.
 * Returns cached data on subsequent calls.
 */
async function fetchBoundaries() {
  if (cachedBoundaries) return cachedBoundaries;
  try {
    const res = await fetch(BOUNDARIES_URL);
    if (!res.ok) throw new Error(`Boundaries fetch failed: ${res.status}`);
    cachedBoundaries = await res.json();
    return cachedBoundaries;
  } catch (err) {
    console.error('[choropleth] Failed to fetch boundaries:', err);
    return null;
  }
}

/**
 * Aggregate observations by country using point-in-polygon spatial join.
 *
 * @param {object} geojson - GeoJSON FeatureCollection of observation points
 * @param {object} boundaries - Natural Earth GeoJSON FeatureCollection
 * @param {string|null} colorBy - If set, count unique taxon values per region (species richness)
 * @returns {object} Map of country name → count
 */
function aggregateByRegion(geojson, boundaries, colorBy) {
  if (!geojson?.features?.length || !boundaries?.features?.length) return {};

  const counts = {};
  // For species richness: track unique taxa per country
  const taxaSets = {};

  for (const obs of geojson.features) {
    if (!obs.geometry || obs.geometry.type !== 'Point') continue;

    const point = obs.geometry;
    let matched = false;

    for (const boundary of boundaries.features) {
      if (!boundary.geometry) continue;

      const geomType = boundary.geometry.type;
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue;

      let inside = false;
      if (geomType === 'Polygon') {
        inside = booleanPointInPolygon(point, boundary);
      } else {
        // MultiPolygon: test each sub-polygon
        for (const coords of boundary.geometry.coordinates) {
          const subPoly = { type: 'Polygon', coordinates: coords };
          if (booleanPointInPolygon(point, { type: 'Feature', geometry: subPoly })) {
            inside = true;
            break;
          }
        }
      }

      if (inside) {
        const name = boundary.properties.name || boundary.properties.NAME || 'Unknown';
        if (colorBy) {
          const taxon = obs.properties?.[colorBy] ?? 'Unknown';
          if (!taxaSets[name]) taxaSets[name] = new Set();
          taxaSets[name].add(taxon);
        } else {
          counts[name] = (counts[name] || 0) + 1;
        }
        matched = true;
        break;
      }
    }

    if (!matched) {
      const key = 'Other';
      if (colorBy) {
        const taxon = obs.properties?.[colorBy] ?? 'Unknown';
        if (!taxaSets[key]) taxaSets[key] = new Set();
        taxaSets[key].add(taxon);
      } else {
        counts[key] = (counts[key] || 0) + 1;
      }
    }
  }

  // If counting species richness, convert sets to counts
  if (colorBy) {
    for (const [name, taxa] of Object.entries(taxaSets)) {
      counts[name] = taxa.size;
    }
  }

  return counts;
}

export async function add(map, sourceId, geojson, colorBy) {
  currentGeojson = geojson;
  currentColorBy = colorBy;

  // Store the points source
  if (!map.getSource(POINTS_SOURCE)) {
    map.addSource(POINTS_SOURCE, {
      type: 'geojson',
      data: geojson
    });
  } else {
    map.getSource(POINTS_SOURCE).setData(geojson);
  }

  const boundaries = await fetchBoundaries();
  if (!boundaries) return;

  countByCountry = aggregateByRegion(geojson, boundaries, colorBy);
  await renderChoropleth(map, boundaries);
}

export function remove(map, sourceId) {
  if (map.getLayer(CHOROPLETH_LAYER)) map.removeLayer(CHOROPLETH_LAYER);
  if (map.getLayer(BOUNDARIES_OUTLINE)) map.removeLayer(BOUNDARIES_OUTLINE);
  if (map.getSource(BOUNDARIES_SOURCE)) map.removeSource(BOUNDARIES_SOURCE);
  if (map.getSource(POINTS_SOURCE)) map.removeSource(POINTS_SOURCE);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
  boundariesLoaded = false;
}

export async function updateColorBy(map, sourceId, geojson, colorBy) {
  currentGeojson = geojson;
  currentColorBy = colorBy;

  const boundaries = await fetchBoundaries();
  if (!boundaries) return;

  countByCountry = aggregateByRegion(geojson, boundaries, colorBy);

  // Remove existing layers and source to re-render with new data
  if (map.getLayer(CHOROPLETH_LAYER)) map.removeLayer(CHOROPLETH_LAYER);
  if (map.getLayer(BOUNDARIES_OUTLINE)) map.removeLayer(BOUNDARIES_OUTLINE);
  if (map.getSource(BOUNDARIES_SOURCE)) map.removeSource(BOUNDARIES_SOURCE);
  boundariesLoaded = false;

  await renderChoropleth(map, boundaries);
}

async function renderChoropleth(map, boundaries) {
  if (boundariesLoaded) {
    // Update existing source data
    const source = map.getSource(BOUNDARIES_SOURCE);
    if (source) {
      const enriched = enrichBoundaries(boundaries);
      source.setData(enriched);
      updateFillColor(map);
    }
    return;
  }

  const enriched = enrichBoundaries(boundaries);

  map.addSource(BOUNDARIES_SOURCE, {
    type: 'geojson',
    data: enriched
  });

  const maxCount = Math.max(1, ...Object.values(countByCountry));

  map.addLayer({
    id: CHOROPLETH_LAYER,
    type: 'fill',
    source: BOUNDARIES_SOURCE,
    paint: {
      'fill-color': [
        'interpolate', ['linear'],
        ['get', '_obs_count'],
        0, 'rgba(30, 30, 60, 0.3)',
        1, '#1a237e',
        Math.ceil(maxCount * 0.25), '#1565c0',
        Math.ceil(maxCount * 0.5), '#f9a825',
        maxCount, '#e6194b'
      ],
      'fill-opacity': 0.7
    }
  }, getFirstSymbolLayerId(map));

  map.addLayer({
    id: BOUNDARIES_OUTLINE,
    type: 'line',
    source: BOUNDARIES_SOURCE,
    paint: {
      'line-color': 'rgba(255,255,255,0.2)',
      'line-width': 0.5
    }
  });

  boundariesLoaded = true;
}

/**
 * Clone boundaries and inject observation counts into properties.
 */
function enrichBoundaries(boundaries) {
  return {
    type: 'FeatureCollection',
    features: boundaries.features.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        _obs_count: countByCountry[f.properties.name || f.properties.NAME] || 0
      }
    }))
  };
}

/**
 * Update fill-color paint property with current count data.
 */
function updateFillColor(map) {
  if (!map.getLayer(CHOROPLETH_LAYER)) return;
  const maxCount = Math.max(1, ...Object.values(countByCountry));
  map.setPaintProperty(CHOROPLETH_LAYER, 'fill-color', [
    'interpolate', ['linear'],
    ['get', '_obs_count'],
    0, 'rgba(30, 30, 60, 0.3)',
    1, '#1a237e',
    Math.ceil(maxCount * 0.25), '#1565c0',
    Math.ceil(maxCount * 0.5), '#f9a825',
    maxCount, '#e6194b'
  ]);
}

function getFirstSymbolLayerId(map) {
  const layers = map.getStyle().layers;
  for (const layer of layers) {
    if (layer.type === 'symbol') return layer.id;
  }
  return undefined;
}
