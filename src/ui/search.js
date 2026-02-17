/**
 * Search panel UI.
 * Handles taxon/place autocomplete, date range, quality grade,
 * and triggers observation fetches.
 */
import { searchTaxa, searchPlaces, fetchObservations } from '../data/api.js';
import { observationsToFeatures, featureCollection } from '../data/transform.js';
import { getCached, setCache } from '../data/cache.js';

let currentSearch = null;
let selectedTaxon = null;
let selectedPlace = null;

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Initialize search UI event handlers.
 * @param {Function} onResults - Called with (geojsonFeatureCollection) when data arrives
 */
export function initSearch(onResults) {
  const taxonInput = document.getElementById('taxon-input');
  const taxonSuggestions = document.getElementById('taxon-suggestions');
  const placeInput = document.getElementById('place-input');
  const placeSuggestions = document.getElementById('place-suggestions');
  const searchBtn = document.getElementById('search-btn');
  const status = document.getElementById('search-status');

  // Taxon autocomplete
  taxonInput.addEventListener('input', debounce(async () => {
    const q = taxonInput.value.trim();
    if (q.length < 2) {
      taxonSuggestions.hidden = true;
      selectedTaxon = null;
      return;
    }
    try {
      const results = await searchTaxa(q);
      renderSuggestions(taxonSuggestions, results.map(t => ({
        label: t.name,
        sublabel: t.commonName,
        data: t
      })), (item) => {
        selectedTaxon = item.data;
        taxonInput.value = item.data.name;
        taxonSuggestions.hidden = true;
      });
    } catch (e) {
      console.error('Taxon search error:', e);
    }
  }, 300));

  // Place autocomplete
  placeInput.addEventListener('input', debounce(async () => {
    const q = placeInput.value.trim();
    if (q.length < 2) {
      placeSuggestions.hidden = true;
      selectedPlace = null;
      return;
    }
    try {
      const results = await searchPlaces(q);
      renderSuggestions(placeSuggestions, results.map(p => ({
        label: p.name,
        sublabel: '',
        data: p
      })), (item) => {
        selectedPlace = item.data;
        placeInput.value = item.data.name;
        placeSuggestions.hidden = true;
      });
    } catch (e) {
      console.error('Place search error:', e);
    }
  }, 300));

  // Close suggestions on click outside
  document.addEventListener('click', (e) => {
    if (!taxonInput.contains(e.target) && !taxonSuggestions.contains(e.target)) {
      taxonSuggestions.hidden = true;
    }
    if (!placeInput.contains(e.target) && !placeSuggestions.contains(e.target)) {
      placeSuggestions.hidden = true;
    }
  });

  // Search button
  searchBtn.addEventListener('click', () => {
    executeSearch(onResults, status, searchBtn);
  });

  // Enter key triggers search
  for (const input of [taxonInput, placeInput]) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeSearch(onResults, status, searchBtn);
    });
  }
}

/**
 * Execute a search programmatically (used by quick-select).
 */
export function triggerSearch(params, onResults) {
  const taxonInput = document.getElementById('taxon-input');
  const placeInput = document.getElementById('place-input');
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  const qualityGrade = document.getElementById('quality-grade');
  const status = document.getElementById('search-status');
  const searchBtn = document.getElementById('search-btn');

  if (params.taxonName) {
    taxonInput.value = params.taxonName;
    selectedTaxon = { id: params.taxonId, name: params.taxonName };
  }
  if (params.placeName) {
    placeInput.value = params.placeName;
    selectedPlace = { id: params.placeId, name: params.placeName };
  }
  if (params.dateFrom) dateFrom.value = params.dateFrom;
  if (params.dateTo) dateTo.value = params.dateTo;
  if (params.qualityGrade) qualityGrade.value = params.qualityGrade;

  executeSearch(onResults, status, searchBtn);
}

async function executeSearch(onResults, statusEl, searchBtn) {
  if (currentSearch) currentSearch.abort();
  currentSearch = new AbortController();

  const params = gatherParams();

  if (!params.taxonId && !params.taxonName && !params.placeId) {
    showStatus(statusEl, 'Please enter a taxon or place to search.', true);
    return;
  }

  searchBtn.disabled = true;
  showStatus(statusEl, 'Searching...');

  const cached = await getCached(params);
  if (cached) {
    showStatus(statusEl, 'Loaded ' + cached.features.length + ' observations (cached)');
    searchBtn.disabled = false;
    onResults(cached);
    return;
  }

  let allFeatures = [];

  try {
    await fetchObservations(params, (results, progress) => {
      const features = observationsToFeatures(results);
      allFeatures = allFeatures.concat(features);
      const geojson = featureCollection(allFeatures);
      showStatus(statusEl, 'Fetching... ' + progress.fetched + ' of ~' + progress.total + ' observations');
      onResults(geojson);
    }, currentSearch.signal);

    const finalGeojson = featureCollection(allFeatures);
    showStatus(statusEl, allFeatures.length + ' observations loaded');
    searchBtn.disabled = false;

    await setCache(params, finalGeojson);
  } catch (e) {
    if (e.name === 'AbortError') {
      showStatus(statusEl, 'Search cancelled');
    } else {
      showStatus(statusEl, 'Error: ' + e.message, true);
    }
    searchBtn.disabled = false;
  }
}

function gatherParams() {
  return {
    taxonId: selectedTaxon?.id || null,
    taxonName: !selectedTaxon?.id ? document.getElementById('taxon-input').value.trim() : null,
    placeId: selectedPlace?.id || null,
    dateFrom: document.getElementById('date-from').value || null,
    dateTo: document.getElementById('date-to').value || null,
    qualityGrade: document.getElementById('quality-grade').value || null
  };
}

function showStatus(el, message, isError = false) {
  el.hidden = false;
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function renderSuggestions(container, items, onSelect) {
  // Clear using safe DOM methods
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  if (items.length === 0) {
    container.hidden = true;
    return;
  }

  for (const item of items) {
    const div = document.createElement('div');
    div.className = 'suggestion-item';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = item.label;
    div.appendChild(nameSpan);

    if (item.sublabel) {
      div.appendChild(document.createElement('br'));
      const subSpan = document.createElement('span');
      subSpan.className = 'common-name';
      subSpan.textContent = item.sublabel;
      div.appendChild(subSpan);
    }

    div.addEventListener('click', () => onSelect(item));
    container.appendChild(div);
  }
  container.hidden = false;
}
