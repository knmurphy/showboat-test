/**
 * Rate-limited iNaturalist API client.
 * Enforces 1 request/second, per_page=200, custom User-Agent.
 */

const BASE_URL = 'https://api.inaturalist.org/v1';
const PER_PAGE = 200;
const MIN_REQUEST_INTERVAL = 1100; // slightly over 1s to be safe

let lastRequestTime = 0;
let requestQueue = Promise.resolve();

/**
 * Queue a fetch to respect rate limits. Returns parsed JSON.
 */
function rateLimitedFetch(url) {
  requestQueue = requestQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await sleep(MIN_REQUEST_INTERVAL - elapsed);
    }
    lastRequestTime = Date.now();
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });
    if (res.status === 429) {
      // Back off and retry once
      await sleep(5000);
      lastRequestTime = Date.now();
      const retry = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (!retry.ok) throw new Error(`iNaturalist API error: ${retry.status}`);
      return retry.json();
    }
    if (!res.ok) throw new Error(`iNaturalist API error: ${res.status}`);
    return res.json();
  });
  return requestQueue;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Search observations with cursor-based pagination.
 * Yields pages of results via callback. Returns total fetched.
 *
 * @param {Object} params - Search parameters
 * @param {Function} onPage - Called with (geojsonFeatures, { fetched, total }) per page
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<number>} Total observations fetched
 */
export async function fetchObservations(params, onPage, signal) {
  const searchParams = buildSearchParams(params);
  let fetched = 0;
  let idAbove = 0;
  let totalResults = null;

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const url = new URL(`${BASE_URL}/observations`);
    url.search = searchParams.toString();
    url.searchParams.set('per_page', PER_PAGE);
    url.searchParams.set('order', 'asc');
    url.searchParams.set('order_by', 'id');
    if (idAbove > 0) {
      url.searchParams.set('id_above', idAbove);
    }

    const data = await rateLimitedFetch(url.toString());

    if (totalResults === null) {
      totalResults = Math.min(data.total_results, 10000); // API caps at 10K
    }

    if (!data.results || data.results.length === 0) break;

    fetched += data.results.length;
    idAbove = data.results[data.results.length - 1].id;

    onPage(data.results, { fetched, total: totalResults });

    // Stop if we've fetched everything or hit the 10K cap
    if (fetched >= totalResults || data.results.length < PER_PAGE) break;
  }

  return fetched;
}

/**
 * Search for taxon name autocomplete.
 */
export async function searchTaxa(query) {
  if (!query || query.length < 2) return [];
  const url = `${BASE_URL}/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=10`;
  const data = await rateLimitedFetch(url);
  return (data.results || []).map(t => ({
    id: t.id,
    name: t.name,
    commonName: t.preferred_common_name || '',
    rank: t.rank,
    iconicTaxon: t.iconic_taxon_name || ''
  }));
}

/**
 * Search for place autocomplete.
 */
export async function searchPlaces(query) {
  if (!query || query.length < 2) return [];
  const url = `${BASE_URL}/places/autocomplete?q=${encodeURIComponent(query)}&per_page=10`;
  const data = await rateLimitedFetch(url);
  return (data.results || []).map(p => ({
    id: p.id,
    name: p.display_name || p.name,
    bbox: p.bounding_box_geojson
  }));
}

function buildSearchParams(params) {
  const sp = new URLSearchParams();
  if (params.taxonId) sp.set('taxon_id', params.taxonId);
  else if (params.taxonName) sp.set('taxon_name', params.taxonName);
  if (params.placeId) sp.set('place_id', params.placeId);
  if (params.dateFrom) sp.set('d1', params.dateFrom);
  if (params.dateTo) sp.set('d2', params.dateTo);
  if (params.qualityGrade) sp.set('quality_grade', params.qualityGrade);
  // Always include geo data
  sp.set('geo', 'true');
  return sp;
}
