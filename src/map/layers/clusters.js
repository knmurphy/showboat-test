/**
 * Cluster layer.
 * Groups nearby observations into numbered circles.
 * Size by count, color by dominant taxon.
 */
import maplibregl from 'maplibre-gl';

const SOURCE_ID_CLUSTER = 'observations-clustered';
const CLUSTER_LAYER = 'obs-clusters';
const CLUSTER_COUNT_LAYER = 'obs-cluster-count';
const UNCLUSTERED_LAYER = 'obs-unclustered';
import { buildColorMatch } from '../palette.js';

export function add(map, sourceId, geojson, colorBy) {
  // Clusters need their own source with cluster: true
  if (map.getSource(SOURCE_ID_CLUSTER)) {
    map.removeSource(SOURCE_ID_CLUSTER);
  }
  // Remove old observation source if it exists (we use a different one for clusters)
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }

  map.addSource(SOURCE_ID_CLUSTER, {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50
  });

  // Cluster circles
  map.addLayer({
    id: CLUSTER_LAYER,
    type: 'circle',
    source: SOURCE_ID_CLUSTER,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        '#42d4f4',   // < 50
        50, '#4363d8', // 50-200
        200, '#f58231', // 200-1000
        1000, '#e6194b' // 1000+
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        18,        // < 50
        50, 24,    // 50-200
        200, 32,   // 200-1000
        1000, 40   // 1000+
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 2,
      'circle-stroke-color': 'rgba(255,255,255,0.5)'
    }
  });

  // Cluster count labels
  map.addLayer({
    id: CLUSTER_COUNT_LAYER,
    type: 'symbol',
    source: SOURCE_ID_CLUSTER,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Noto Sans Regular'],
      'text-size': 13
    },
    paint: {
      'text-color': '#ffffff'
    }
  });

  // Unclustered points
  const uniqueValues = getUniqueValues(geojson, colorBy);
  const colorExpr = buildColorMatch(colorBy, uniqueValues);

  map.addLayer({
    id: UNCLUSTERED_LAYER,
    type: 'circle',
    source: SOURCE_ID_CLUSTER,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': colorExpr,
      'circle-radius': 5,
      'circle-stroke-width': 1,
      'circle-stroke-color': 'rgba(255,255,255,0.5)'
    }
  });

  // Click to zoom into cluster
  map.on('click', CLUSTER_LAYER, onClusterClick);
  map.on('mouseenter', CLUSTER_LAYER, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', CLUSTER_LAYER, () => {
    map.getCanvas().style.cursor = '';
  });
}

export function remove(map, sourceId) {
  map.off('click', CLUSTER_LAYER, onClusterClick);

  if (map.getLayer(CLUSTER_COUNT_LAYER)) map.removeLayer(CLUSTER_COUNT_LAYER);
  if (map.getLayer(CLUSTER_LAYER)) map.removeLayer(CLUSTER_LAYER);
  if (map.getLayer(UNCLUSTERED_LAYER)) map.removeLayer(UNCLUSTERED_LAYER);
  if (map.getSource(SOURCE_ID_CLUSTER)) map.removeSource(SOURCE_ID_CLUSTER);
  // Also clean up the main source if it exists
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

export function updateColorBy(map, sourceId, geojson, colorBy) {
  const uniqueValues = getUniqueValues(geojson, colorBy);
  const colorExpr = buildColorMatch(colorBy, uniqueValues);
  if (map.getLayer(UNCLUSTERED_LAYER)) {
    map.setPaintProperty(UNCLUSTERED_LAYER, 'circle-color', colorExpr);
  }
}

function onClusterClick(e) {
  const map = e.target;
  const features = map.queryRenderedFeatures(e.point, {
    layers: [CLUSTER_LAYER]
  });
  if (!features.length) return;

  const clusterId = features[0].properties.cluster_id;
  map.getSource(SOURCE_ID_CLUSTER).getClusterExpansionZoom(clusterId, (err, zoom) => {
    if (err) return;
    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom
    });
  });
}

function getUniqueValues(geojson, property) {
  const values = new Set();
  for (const f of geojson.features) {
    if (f.properties[property]) values.add(f.properties[property]);
  }
  return [...values].sort();
}
