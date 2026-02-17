/**
 * Color palette for categorical data visualization.
 * Distinct, colorblind-friendly-ish palette for up to 20 categories.
 * Supports multiple named palettes selectable at runtime.
 */

const PALETTES = {
  default: [
    '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
    '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3',
    '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#ffe119',
  ],
  earth: [
    '#8B4513', '#556B2F', '#DAA520', '#6B8E23', '#A0522D',
    '#BDB76B', '#8FBC8F', '#D2B48C', '#BC8F8F', '#CD853F',
    '#9ACD32', '#DEB887', '#F4A460', '#C4A484', '#808000',
    '#A9A96A', '#6B4226', '#8B7D6B', '#3B5323', '#B8860B',
  ],
  ocean: [
    '#006994', '#40E0D0', '#00CED1', '#20B2AA', '#5F9EA0',
    '#008B8B', '#48D1CC', '#00BFFF', '#4682B4', '#1E90FF',
    '#87CEEB', '#00808C', '#2E8B57', '#66CDAA', '#7FFFD4',
    '#B0E0E6', '#ADD8E6', '#5B9BD5', '#3CB4B4', '#0077B6',
  ],
  vivid: [
    '#FF003C', '#00FF87', '#3D00FF', '#FFD300', '#FF00FF',
    '#00FFFF', '#FF6100', '#B4FF00', '#FF0099', '#00B4FF',
    '#FFFF00', '#FF3D00', '#00FFD5', '#9D00FF', '#FF7700',
    '#00FF3C', '#FF0055', '#00D5FF', '#D5FF00', '#FF00CC',
  ],
};

let activePaletteName = 'default';

function getActivePaletteColors() {
  return PALETTES[activePaletteName] || PALETTES.default;
}

/**
 * Set the active palette by name.
 */
export function setActivePalette(name) {
  if (PALETTES[name]) {
    activePaletteName = name;
  }
}

/**
 * Get the active palette name.
 */
export function getActivePalette() {
  return activePaletteName;
}

const FALLBACK_COLOR = '#888888';

// Iconic taxon colors (iNaturalist standard-ish)
const ICONIC_TAXON_COLORS = {
  'Fungi': '#e6194b',
  'Plantae': '#3cb44b',
  'Aves': '#4363d8',
  'Mammalia': '#f58231',
  'Reptilia': '#911eb4',
  'Amphibia': '#42d4f4',
  'Insecta': '#f032e6',
  'Arachnida': '#9A6324',
  'Mollusca': '#469990',
  'Actinopterygii': '#000075',
  'Chromista': '#bfef45',
  'Protozoa': '#dcbeff',
  'Unknown': FALLBACK_COLOR
};

/**
 * Build a MapLibre match expression for coloring features by a property.
 */
export function buildColorMatch(property, uniqueValues) {
  if (property === 'iconic_taxon_name') {
    return buildIconicColorMatch();
  }

  const palette = getActivePaletteColors();
  const expr = ['match', ['get', property]];
  uniqueValues.forEach((val, i) => {
    expr.push(val);
    expr.push(palette[i % palette.length]);
  });
  expr.push(FALLBACK_COLOR); // fallback
  return expr;
}

/**
 * Build iconic taxon color match expression.
 */
function buildIconicColorMatch() {
  const expr = ['match', ['get', 'iconic_taxon_name']];
  for (const [name, color] of Object.entries(ICONIC_TAXON_COLORS)) {
    expr.push(name);
    expr.push(color);
  }
  expr.push(FALLBACK_COLOR);
  return expr;
}

/**
 * Get the color assigned to a specific value for a given property.
 */
export function getColor(property, value, uniqueValues) {
  if (property === 'iconic_taxon_name') {
    return ICONIC_TAXON_COLORS[value] || FALLBACK_COLOR;
  }
  const palette = getActivePaletteColors();
  const idx = uniqueValues.indexOf(value);
  return idx >= 0 ? palette[idx % palette.length] : FALLBACK_COLOR;
}

/**
 * Get the full legend data (value → color) for a property.
 */
export function getLegendData(property, uniqueValues) {
  const palette = getActivePaletteColors();
  return uniqueValues.map((val, i) => ({
    label: val,
    color: property === 'iconic_taxon_name'
      ? (ICONIC_TAXON_COLORS[val] || FALLBACK_COLOR)
      : palette[i % palette.length]
  }));
}
