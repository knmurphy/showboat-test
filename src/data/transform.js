/**
 * Transform iNaturalist API observation results into GeoJSON features.
 */

/**
 * Convert an array of iNaturalist observation objects into GeoJSON features.
 * Filters out observations without coordinates.
 */
export function observationsToFeatures(observations) {
  return observations
    .filter(obs => obs.geojson && obs.geojson.coordinates)
    .map(obs => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          obs.geojson.coordinates[0],
          obs.geojson.coordinates[1]
        ]
      },
      properties: extractProperties(obs)
    }));
}

/**
 * Wrap an array of features into a GeoJSON FeatureCollection.
 */
export function featureCollection(features) {
  return {
    type: 'FeatureCollection',
    features
  };
}

function extractProperties(obs) {
  const taxon = obs.taxon || {};
  return {
    id: obs.id,
    taxon_name: taxon.name || 'Unknown',
    taxon_common_name: taxon.preferred_common_name || '',
    taxon_rank: taxon.rank || '',
    taxon_family: findAncestorName(taxon, 'family') || taxon.name || 'Unknown',
    taxon_order: findAncestorName(taxon, 'order') || '',
    taxon_class: findAncestorName(taxon, 'class') || '',
    iconic_taxon_name: taxon.iconic_taxon_name || 'Unknown',
    observed_on: obs.observed_on || '',
    observer: obs.user ? obs.user.login : '',
    quality_grade: obs.quality_grade || '',
    photo_url: getPhotoUrl(obs),
    uri: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`
  };
}

function findAncestorName(taxon, rank) {
  // The API sometimes includes ancestor info in different formats.
  // For the v1 API, taxon objects include ancestors array when available.
  if (taxon.ancestors) {
    const ancestor = taxon.ancestors.find(a => a.rank === rank);
    if (ancestor) return ancestor.name;
  }
  // Fallback: if the taxon itself is at this rank
  if (taxon.rank === rank) return taxon.name;
  return '';
}

function getPhotoUrl(obs) {
  if (obs.photos && obs.photos.length > 0 && obs.photos[0].url) {
    // Replace 'square' with 'small' for a slightly larger thumbnail
    return obs.photos[0].url.replace('square', 'small');
  }
  return '';
}
