/**
 * Dynamic color legend.
 * Shows the color mapping for the current layer's colorBy property.
 */
import { getLegendData } from '../map/palette.js';

/**
 * Update the legend display.
 * @param {string} colorBy - Property name used for coloring
 * @param {string[]} uniqueValues - Unique values of that property
 * @param {Object} [counts] - Optional { value: count } for showing observation counts
 */
export function updateLegend(colorBy, uniqueValues, counts) {
  const container = document.getElementById('legend-content');
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (!uniqueValues || uniqueValues.length === 0) {
    const empty = document.createElement('span');
    empty.style.cssText = 'color:var(--text-muted);font-size:0.8rem';
    empty.textContent = 'No data loaded';
    container.appendChild(empty);
    return;
  }

  const legendData = getLegendData(colorBy, uniqueValues);
  const display = legendData.slice(0, 15);
  const remaining = legendData.length - display.length;

  for (const item of display) {
    const row = document.createElement('div');
    row.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = item.color;
    row.appendChild(swatch);

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = item.label;
    row.appendChild(label);

    if (counts && counts[item.label]) {
      const count = document.createElement('span');
      count.className = 'legend-count';
      count.textContent = String(counts[item.label]);
      row.appendChild(count);
    }

    container.appendChild(row);
  }

  if (remaining > 0) {
    const more = document.createElement('div');
    more.className = 'legend-item';
    const moreLabel = document.createElement('span');
    moreLabel.className = 'legend-label';
    moreLabel.style.cssText = 'color:var(--text-muted);font-size:0.72rem';
    moreLabel.textContent = '+ ' + remaining + ' more';
    more.appendChild(moreLabel);
    container.appendChild(more);
  }
}

/**
 * Count occurrences of each value for a property in a GeoJSON FeatureCollection.
 */
export function countValues(geojson, property) {
  const counts = {};
  for (const f of geojson.features) {
    const val = f.properties[property];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}
