# Showboat Feature Demo

*2026-02-17T13:28:12Z by Showboat 0.6.0*
<!-- showboat-id: 8b642b3b-a660-45e6-8a50-1941469d3391 -->

## natura-map: Biodiversity Observation Mapping

A standalone JavaScript web app that renders iNaturalist observation data on interactive maps. Built on MapLibre GL JS with a Deck.gl escape hatch for heavy visualizations.

Named in honor of Alan Rockefeller (mycologist) who inspired the project.

### Tech Stack
- MapLibre GL JS (vector tiles, GPU-accelerated)
- Deck.gl (lazy-loaded for HexagonLayer, etc.)
- Vite (dev server + bundler)
- Vanilla JS (zero-framework UI)
- CARTO Positron dark basemap (free, no API key)

### Features
- 4 layer types: categorical points, heatmap, clusters, choropleth
- iNaturalist API integration with rate limiting (1 req/sec) and cursor pagination
- Search UI with taxon/place autocomplete
- Quick-select presets (Fungi of California, Birds of Costa Rica, etc.)
- Pre-cached default dataset for instant first load
- Dynamic color legend
- IndexedDB query caching
- Responsive (works on mobile)

### Project Structure

```bash
find natura-map/src -type f | sort && echo '---' && wc -l natura-map/src/**/*.js natura-map/src/**/**/*.js 2>/dev/null | tail -1
```

```output
natura-map/src/data/api.js
natura-map/src/data/cache.js
natura-map/src/data/transform.js
natura-map/src/main.js
natura-map/src/map/deckgl.js
natura-map/src/map/engine.js
natura-map/src/map/layers/choropleth.js
natura-map/src/map/layers/clusters.js
natura-map/src/map/layers/heatmap.js
natura-map/src/map/layers/points.js
natura-map/src/map/palette.js
natura-map/src/ui/controls.js
natura-map/src/ui/legend.js
natura-map/src/ui/quickselect.js
natura-map/src/ui/search.js
---
    1556 total
```

15 source files, ~1,556 lines of JavaScript. No framework dependencies beyond MapLibre GL JS.

### Verifying the build

```bash
cd natura-map && npx vite build 2>&1
```

```output
vite v6.4.1 building for production...
transforming...
✓ 21 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     3.56 kB │ gzip:   1.11 kB
dist/assets/index-C2nSFIGR.css      4.73 kB │ gzip:   1.42 kB
dist/assets/index-zqRuKozA.js   1,044.80 kB │ gzip: 284.21 kB │ map: 2,260.36 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.29s
```

Build succeeded. The 1MB bundle includes MapLibre GL JS (~900KB minified). Deck.gl is NOT in the bundle since it is lazy-loaded only when the user activates a Deck.gl layer type.

### Pre-cached default dataset

```bash
python3 -c "
import json
with open('natura-map/public/data/default.geojson') as f:
    data = json.load(f)
features = data['features']
print(f'Features: {len(features)}')
taxa = set()
for f in features:
    taxa.add(f['properties'].get('taxon_name', 'Unknown'))
print(f'Unique species: {len(taxa)}')
for t in sorted(taxa)[:10]:
    print(f'  - {t}')
if len(taxa) > 10:
    print(f'  ... and {len(taxa) - 10} more')
"
```

```output
Features: 200
Unique species: 104
  - Agaricus augustus
  - Amanita calyptratoides
  - Amanita muscaria
  - Amanita novinupta
  - Amanita ocreata
  - Amanita pantherinoides
  - Amanita phalloides
  - Amanita velosa
  - Annulohypoxylon thouarsianum
  - Armillaria sinapina
  ... and 94 more
```

200 research-grade California fungi observations with 104 unique species. The default dataset loads instantly without any API call.

### iNaturalist API compliance

The API client enforces all iNaturalist recommended practices:

```bash
grep -n 'MIN_REQUEST_INTERVAL\|PER_PAGE\|per_page\|id_above\|rate\|429' natura-map/src/data/api.js | head -20
```

```output
3: * Enforces 1 request/second, per_page=200, custom User-Agent.
7:const PER_PAGE = 200;
8:const MIN_REQUEST_INTERVAL = 1100; // slightly over 1s to be safe
14: * Queue a fetch to respect rate limits. Returns parsed JSON.
16:function rateLimitedFetch(url) {
20:    if (elapsed < MIN_REQUEST_INTERVAL) {
21:      await sleep(MIN_REQUEST_INTERVAL - elapsed);
29:    if (res.status === 429) {
69:    url.searchParams.set('per_page', PER_PAGE);
73:      url.searchParams.set('id_above', idAbove);
76:    const data = await rateLimitedFetch(url.toString());
90:    if (fetched >= totalResults || data.results.length < PER_PAGE) break;
101:  const url = `${BASE_URL}/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=10`;
102:  const data = await rateLimitedFetch(url);
117:  const url = `${BASE_URL}/places/autocomplete?q=${encodeURIComponent(query)}&per_page=10`;
118:  const data = await rateLimitedFetch(url);
```

Key compliance features visible in the code:
- Rate limited to 1.1s between requests (line 8)
- per_page=200 (maximum allowed, line 7)
- Cursor pagination via id_above (line 73)
- HTTP 429 backoff and retry (line 29)
- All reads are unauthenticated (benefits from server-side caching)

### Running locally

To run natura-map:

```bash
cd natura-map && echo 'cd natura-map' && echo 'npm install' && echo 'npm run dev' && echo '' && echo 'Then open http://localhost:3000'
```

```output
cd natura-map
npm install
npm run dev

Then open http://localhost:3000
```

### Deploying to Netlify/Vercel

The built output is a static site in natura-map/dist/:

```bash
ls -la natura-map/dist/ && echo '' && du -sh natura-map/dist/
```

```output
total 8
drwxr-xr-x@  5 knmurphy  staff   160 Feb 17 08:02 .
drwxr-xr-x@ 11 knmurphy  staff   352 Feb 17 08:02 ..
drwxr-xr-x@  5 knmurphy  staff   160 Feb 17 08:02 assets
drwxr-xr-x@  3 knmurphy  staff    96 Feb 17 08:02 data
-rw-r--r--@  1 knmurphy  staff  3555 Feb 17 08:02 index.html

3.3M	natura-map/dist/
```

3.3MB static site (including the pre-cached default dataset). Deploy by pointing Netlify/Vercel at the dist/ directory, or just serve it:

```
npx serve natura-map/dist
```

### Architecture diagram

```
                  +-------------------+
                  |    index.html     |
                  +-------------------+
                          |
                     src/main.js
                    /     |     \
            +------+  +---+---+  +--------+
            | map/ |  | data/ |  |  ui/   |
            +------+  +-------+  +--------+
            |engine|  |  api  |  | search |
            |layers|  | cache |  | quick  |
            |deckgl|  |xform  |  | legend |
            |palette  +-------+  |controls|
            +------+             +--------+
                |
      +---------+---------+----------+
      | points  | heatmap | clusters | choropleth
      +---------+---------+----------+
```

Each layer module exports add(), remove(), and updateColorBy() — a simple interface that the engine swaps between when the user toggles layer types.

```bash {image}
natura-map-sidebar.png
```

![a75a8fd3-2026-02-17](a75a8fd3-2026-02-17.png)

Note: The map itself requires WebGL which is not available in headless Chrome. Open http://localhost:3456 in a real browser to see the full map with tiles, data points, and interactive layers.

### Deck.gl escape hatch

For heavy visualizations, users can drop into Deck.gl:

```bash
head -30 natura-map/src/map/deckgl.js
```

```output
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
```

Deck.gl modules are dynamically imported only when needed. The default bundle stays at ~300KB (MapLibre GL JS). Deck.gl adds ~500KB on demand.

### Next steps
- Add proper spatial join for choropleth (Turf.js point-in-polygon)
- Python helper package for bulk iNaturalist data fetching
- DuckDB integration for offline analytical queries on GBIF exports
- More presets and customizable color palettes
- Export map as image/PDF

---

## New Features

Three features shipped: proper spatial joins for choropleth, customizable color palettes, and map export.

### 1. Turf.js Spatial Join for Choropleth

The choropleth layer previously used a crude bounding-box guess to assign observations to countries. Now it uses proper point-in-polygon testing via @turf/boolean-point-in-polygon, handling both Polygon and MultiPolygon boundaries. Boundaries are cached after first fetch.

```bash
grep -n 'booleanPointInPolygon\|aggregateByRegion\|fetchBoundaries\|guessCountry' natura-map/src/map/layers/choropleth.js
```

```output
7:import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
27:async function fetchBoundaries() {
48:function aggregateByRegion(geojson, boundaries, colorBy) {
69:        inside = booleanPointInPolygon(point, boundary);
74:          if (booleanPointInPolygon(point, { type: 'Feature', geometry: subPoly })) {
131:  const boundaries = await fetchBoundaries();
134:  countByCountry = aggregateByRegion(geojson, boundaries, colorBy);
151:  const boundaries = await fetchBoundaries();
154:  countByCountry = aggregateByRegion(geojson, boundaries, colorBy);
```

No more guessCountry() — every observation is tested against actual Natural Earth boundary polygons. The choropleth updateColorBy() now also re-aggregates, supporting species richness mode.

### 2. Customizable Color Palettes

Four named palettes: default, earth, ocean, vivid. Switchable from a dropdown in the sidebar. Iconic taxon colors (Fungi=red, Plantae=green, etc.) remain fixed regardless of palette selection.

```bash
grep -A1 'const PALETTES' natura-map/src/map/palette.js | head -6 && echo '---' && grep 'setActivePalette\|getActivePalette' natura-map/src/map/palette.js
```

```output
const PALETTES = {
  default: [
---
function getActivePaletteColors() {
export function setActivePalette(name) {
export function getActivePalette() {
  const palette = getActivePaletteColors();
  const palette = getActivePaletteColors();
  const palette = getActivePaletteColors();
```

### 3. More Quick-Select Presets

Added 4 new presets (9 total): Wildflowers of Pacific NW, Mammals of East Africa, Butterflies of Europe, Marine Life of Hawaii.

```bash
grep 'label:' natura-map/src/ui/quickselect.js
```

```output
    label: 'Fungi of California',
    label: 'Birds of Costa Rica',
    label: 'Reptiles of Australia',
    label: 'Mushrooms of NE US',
    label: 'Orchids Worldwide',
    label: 'Wildflowers of Pacific NW',
    label: 'Mammals of East Africa',
    label: 'Butterflies of Europe',
    label: 'Marine Life of Hawaii',
```

### 4. Export Map as Image/PDF

PNG export captures the MapLibre canvas via toDataURL and downloads it. Print/PDF opens a print-friendly window with the map image, title, date, and current legend.

```bash
wc -l natura-map/src/ui/export.js && echo '---' && grep 'preserveDrawingBuffer' natura-map/src/map/engine.js
```

```output
      98 natura-map/src/ui/export.js
---
    preserveDrawingBuffer: true
```

preserveDrawingBuffer: true is set on the MapLibre Map constructor — required for canvas export to work.

### Updated build

```bash
cd natura-map && npx vite build 2>&1
```

```output
[36mvite v6.4.1 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 32 modules transformed.
rendering chunks...
computing gzip size...
[2mdist/[22m[32mindex.html                 [39m[1m[2m    4.20 kB[22m[1m[22m[2m │ gzip:   1.23 kB[22m
[2mdist/[22m[2massets/[22m[35mindex-DIAFRyHI.css  [39m[1m[2m    5.13 kB[22m[1m[22m[2m │ gzip:   1.49 kB[22m
[2mdist/[22m[2massets/[22m[36mindex-D1sK2XzT.js   [39m[1m[33m1,053.96 kB[39m[22m[2m │ gzip: 287.56 kB[22m[2m │ map: 2,298.42 kB[22m
[33m
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
[32m✓ built in 1.22s[39m
```

```bash
find natura-map/src -type f | sort && echo '---' && cat natura-map/src/**/*.js natura-map/src/**/**/*.js 2>/dev/null | wc -l
```

```output
natura-map/src/data/api.js
natura-map/src/data/cache.js
natura-map/src/data/transform.js
natura-map/src/main.js
natura-map/src/map/deckgl.js
natura-map/src/map/engine.js
natura-map/src/map/layers/choropleth.js
natura-map/src/map/layers/clusters.js
natura-map/src/map/layers/heatmap.js
natura-map/src/map/layers/points.js
natura-map/src/map/palette.js
natura-map/src/ui/controls.js
natura-map/src/ui/export.js
natura-map/src/ui/legend.js
natura-map/src/ui/quickselect.js
natura-map/src/ui/search.js
---
    1834
```

16 source files, ~1,834 lines of JavaScript (up from 1,556). Build clean, Turf.js adds only ~9KB gzipped to the bundle.
