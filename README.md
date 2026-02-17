# natura-map

Interactive biodiversity observation mapper. Renders [iNaturalist](https://www.inaturalist.org) data on GPU-accelerated maps with multiple visualization layers.

![natura-map points view](natura-map-points.png)

## Features

- **4 layer types** — categorical points, heatmap, clusters, choropleth
- **iNaturalist API integration** — rate-limited (1 req/sec), cursor pagination, 429 backoff
- **Search with autocomplete** — taxon and place lookup via iNaturalist API
- **9 quick-select presets** — Fungi of California, Birds of Costa Rica, Butterflies of Europe, etc.
- **4 color palettes** — default, earth, ocean, vivid (switchable at runtime)
- **Choropleth spatial join** — proper point-in-polygon via Turf.js against Natural Earth boundaries
- **Map export** — PNG download and Print/PDF with legend
- **Pre-cached default dataset** — 200 California fungi observations load instantly
- **IndexedDB query caching** — repeat searches skip the API
- **Deck.gl escape hatch** — lazy-loaded for heavy visualizations (HexagonLayer, etc.)
- **Responsive** — works on mobile

## Tech Stack

- [MapLibre GL JS](https://maplibre.org) — vector tile map engine
- [Deck.gl](https://deck.gl) — lazy-loaded for advanced layers
- [Turf.js](https://turfjs.org) — spatial join for choropleth
- [Vite](https://vitejs.dev) — dev server and bundler
- Vanilla JS — zero-framework UI
- [CARTO Positron](https://carto.com/basemaps/) dark basemap — free, no API key

## Getting Started

```bash
git clone https://github.com/knmurphy/natura-map.git
cd natura-map
npm install
npm run dev
```

Open http://localhost:3000

## Build & Deploy

```bash
npm run build
```

Output is a static site in `dist/`. Deploy to Netlify, Vercel, GitHub Pages, or serve locally:

```bash
npx serve dist
```

## Project Structure

```
src/
  main.js              # Entry, wires map + UI + data
  map/
    engine.js          # MapLibre setup, layer management
    palette.js         # 4 named color palettes
    deckgl.js          # Lazy-loaded Deck.gl overlay
    layers/
      points.js        # Categorical colored circles
      heatmap.js       # Density heatmap
      clusters.js      # Clustered markers
      choropleth.js    # Region fills (Turf.js spatial join)
  data/
    api.js             # Rate-limited iNaturalist API client
    transform.js       # API response → GeoJSON
    cache.js           # IndexedDB query cache
  ui/
    search.js          # Search panel with autocomplete
    quickselect.js     # Preset query buttons
    legend.js          # Dynamic color legend
    controls.js        # Layer type toggle, palette selector
    export.js          # PNG/PDF map export
```

## Acknowledgments

- Data from [iNaturalist](https://www.inaturalist.org)
- Inspired by [Alan Rockefeller](https://www.alanrockefeller.com)

## License

[MIT](LICENSE)
