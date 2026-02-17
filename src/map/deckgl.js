/**
 * Deck.gl escape hatch.
 * Lazy-loads Deck.gl and provides MapboxOverlay integration with MapLibre.
 *
 * Usage:
 *   import { addDeckLayer, removeDeckLayers } from './deckgl.js';
 *   await addDeckLayer(map, new HexagonLayer({ ... }));
 */

let overlay = null;
let layers = [];
let deckModules = null;

/**
 * Lazy-load Deck.gl modules.
 */
async function loadDeck() {
  if (deckModules) return deckModules;

  const [mapboxModule, coreModule, layersModule, aggModule] = await Promise.all([
    import('@deck.gl/mapbox'),
    import('@deck.gl/core'),
    import('@deck.gl/layers'),
    import('@deck.gl/aggregation-layers')
  ]);

  deckModules = {
    MapboxOverlay: mapboxModule.MapboxOverlay,
    ...coreModule,
    ...layersModule,
    ...aggModule
  };

  return deckModules;
}

/**
 * Add a Deck.gl layer to the map.
 * The first call initializes the MapboxOverlay control.
 *
 * @param {maplibregl.Map} map - The MapLibre map instance
 * @param {object} layer - A Deck.gl layer instance
 */
export async function addDeckLayer(map, layer) {
  const { MapboxOverlay } = await loadDeck();

  layers.push(layer);

  if (!overlay) {
    overlay = new MapboxOverlay({
      interleaved: true,
      layers
    });
    map.addControl(overlay);
  } else {
    overlay.setProps({ layers: [...layers] });
  }
}

/**
 * Remove all Deck.gl layers.
 */
export function removeDeckLayers(map) {
  if (overlay) {
    overlay.setProps({ layers: [] });
    layers = [];
  }
}

/**
 * Get the Deck.gl module exports (for creating layers externally).
 * Example: const { HexagonLayer } = await getDeck();
 */
export async function getDeck() {
  return loadDeck();
}
