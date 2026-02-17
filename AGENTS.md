# Repository Guidelines

## Issue Tracking

This project uses **bd (beads)** for issue tracking.
Run `bd prime` for workflow context, or install hooks (`bd hooks install`) for auto-injection.

**Quick reference:**
- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd close <id>` - Complete work
- `bd sync` - Sync with git (run at session end)

For full workflow details: `bd prime`

---

## Project Overview

**natura-map** is an interactive biodiversity observation mapper that visualizes iNaturalist data on GPU-accelerated maps. The application provides multiple visualization layers (points, heatmap, clusters, choropleth) with real-time search, autocomplete, and map export capabilities.

**Tech Stack:**
- MapLibre GL JS (vector tile map engine)
- Deck.gl (lazy-loaded for advanced layers)
- Turf.js (spatial operations)
- Vite (dev server & bundler)
- Vanilla JavaScript (no frameworks)

---

## Architecture & Data Flow

### Architecture Pattern
**Modular ES modules with event-driven UI.** The app is organized into three core layers:

```
UI Layer (src/ui/)
    ↓ user events
Application Layer (src/main.js)
    ↓ orchestrates
Data Layer (src/data/) + Map Layer (src/map/)
    ↓
MapLibre GL JS renders to canvas
```

### Data Flow
1. **User search** → `src/ui/search.js` triggers search
2. **API fetch** → `src/data/api.js` (rate-limited, 1 req/sec, 429 backoff)
3. **Transform** → `src/data/transform.js` converts API response to GeoJSON
4. **Cache** → `src/data/cache.js` stores in IndexedDB
5. **Update engine** → `src/map/engine.js` sets data on map source
6. **Render layer** → Active layer module (`src/map/layers/*.js`) visualizes data
7. **Update UI** → Legend, controls refresh

### Key Architectural Decisions
- **Layer modules are pluggable** — Each layer (points/heatmap/clusters/choropleth) exports `add()`, `remove()`, `updateColorBy()` functions
- **No framework** — Vanilla JS with direct DOM manipulation
- **Map-centric state** — MapLibre map instance is the single source of truth for data
- **Lazy loading** — Deck.gl modules loaded on-demand (optionalDependencies)

---

## Key Directories

```
src/
├── main.js                    # Entry point, wires all modules together
├── map/
│   ├── engine.js              # MapLibre initialization, layer switching
│   ├── palette.js             # 4 named color palettes (default, earth, ocean, vivid)
│   ├── deckgl.js              # Lazy-loaded Deck.gl MapboxOverlay integration
│   └── layers/
│       ├── points.js          # Categorical colored circles
│       ├── heatmap.js         # Density heatmap (MapLibre heatmap layer)
│       ├── clusters.js        # Clustered markers with popup interactivity
│       └── choropleth.js      # Region fills via Turf.js point-in-polygon spatial join
├── data/
│   ├── api.js                 # Rate-limited iNaturalist API client (1 req/sec)
│   ├── transform.js           # API response → GeoJSON FeatureCollection
│   └── cache.js               # IndexedDB query caching (repeat searches skip API)
└── ui/
    ├── search.js              # Taxon/place search with autocomplete dropdowns
    ├── quickselect.js         # 9 preset query buttons (e.g., "Fungi of California")
    ├── legend.js              # Dynamic color legend with counts
    ├── controls.js            # Layer type toggle, palette selector
    └── export.js              # PNG/PDF export (waits for map idle before capture)

dist/                          # Vite build output (static site)
data/
└── default.geojson            # Pre-cached 200 California fungi observations
```

---

## Development Commands

```bash
# Development
npm run dev          # Start Vite dev server on :3000

# Build
npm run build        # Build to dist/ (sourcemaps enabled, target: esnext)
npm run preview      # Preview production build locally
```

**No test suite** — Manual testing in browser.

---

## Code Conventions & Common Patterns

### Module Pattern
- **ES modules** — All files use `import/export`
- **Named exports** for modules, default export for entry point (`src/main.js`)
- **Functional style** — Minimal classes, prefer function composition

### Naming Conventions
- **Files:** `kebab-case.js` (e.g., `deckgl.js`, `quickselect.js`)
- **Variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `SOURCE_ID`, `BASEMAP_STYLE`)
- **Functions:** `camelCase`, verbs first (e.g., `initMap()`, `updateColorBy()`)

### Async Patterns
- **API calls:** `async/await` with signal-based cancellation
- **Event handlers:** Callback functions passed to `init*()` functions
- **Map loading:** `map.once('load', ...)` for initialization timing

### Error Handling
- **Try-catch** around async operations (e.g., cache reads, API calls)
- **Silent failures** with console.log for non-critical paths (e.g., missing pre-cached data)
- **User-facing alerts** for export failures only

### State Management
- **No global state** — State lives in module closures
- **Map instance** — Stored in closure in `src/map/engine.js`, accessed via `getMap()`
- **Current data** — Stored in `src/map/engine.js` closure, accessed via `getData()`
- **UI state** — Retrieved from DOM (e.g., active layer button, select values)

### Layer Module Interface
All layer modules MUST export:
```javascript
export async function add(map, sourceId, geojson, colorBy) { ... }
export function remove(map, sourceId) { ... }
export function updateColorBy(map, sourceId, geojson, colorBy) { ... }
```

### Color Handling
- **Palettes** defined in `src/map/palette.js` — 9-category color scales
- **Dynamic matching** via `buildColorMatch(property, uniqueValues)` — returns value→color function
- **Legend generation** via `getLegendData(property, uniqueValues)` — returns swatches + labels

### Rate Limiting
- **API client** enforces 1 req/sec with `lastRequest` timestamp check
- **429 backoff** — Exponential backoff on rate limit errors
- **IndexedDB cache** — Avoid repeated API calls for same query

---

## Important Files

### Entry Points
- `src/main.js` — Application entry point, wires all modules
- `index.html` — HTML shell, loads `src/main.js` as module

### Configuration
- `vite.config.js` — Build config (target: esnext, sourcemaps: true, port: 3000)
- `package.json` — Dependencies (MapLibre, Turf.js, Vite)

### Core Modules
- `src/map/engine.js` — MapLibre initialization, layer orchestration
- `src/data/api.js` — iNaturalist API client with rate limiting
- `src/data/transform.js` — API → GeoJSON conversion

### Layer Implementations
- `src/map/layers/points.js` — Simple circle layer with categorical colors
- `src/map/layers/choropleth.js` — Complex spatial join with Turf.js

---

## Runtime & Tooling Preferences

- **Runtime:** Browser-only (ES2022+, no Node.js required after build)
- **Package manager:** npm (assumed, but any works)
- **Build tool:** Vite 6.0+
- **Target:** `esnext` (modern browsers, no transpilation beyond ES modules)
- **Dev server:** Vite dev server on port 3000
- **Browser support:** Modern browsers with WebGL (MapLibre requirement)

---

## Testing & QA

**No automated tests.** Manual testing workflow:
1. Run `npm run dev`
2. Open http://localhost:3000
3. Test layer switching, search, presets, export
4. Verify rate limiting works (rapid searches should throttle)
5. Check IndexedDB cache (repeat searches should be instant)

**Coverage expectations:** None — manual QA only.

---

## Common Tasks

### Adding a New Layer Type
1. Create `src/map/layers/yourlayer.js` with `add()`, `remove()`, `updateColorBy()` exports
2. Import in `src/main.js`, add to `LAYER_MODULES` object
3. Add button to `index.html` in `.layer-toggle` div
4. CSS styling auto-applies via `.layer-btn` class

### Adding a New Color Palette
1. Edit `src/map/palette.js` — add 9-color array to `PALETTES` object
2. Add `<option>` in `index.html` to `#palette-select`
3. No code changes needed — palette control auto-wires

### Modifying API Behavior
- **Rate limit:** Edit `lastRequest` check in `src/data/api.js`
- **Cache duration:** Edit `CACHE_TTL` in `src/data/cache.js`
- **API endpoint:** Edit `API_BASE` in `src/data/api.js`

### Debugging Map Export
- Export waits for `map.once('idle')` — check console for errors
- If blank images: Map not rendering, check `preserveDrawingBuffer: true` in map config
- Timing issues: Increase delay in `captureCanvas()` function in `src/ui/export.js`
