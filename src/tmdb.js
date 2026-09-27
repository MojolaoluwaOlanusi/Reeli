async function request(path, options = {}) {
  const response = await fetch(path, options);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(response.ok
      ? 'The movie API returned a webpage instead of data. Check the deployment API route configuration.'
      : `The movie API returned HTTP ${response.status} without JSON.`);
  }

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load movie data.');
  return result;
}

export const searchTitles = (query, signal) => {
  const params = new URLSearchParams({ q: query });
  return request(`/api/search?${params}`, { signal });
};

export const getTrendingTitles = (signal) => request('/api/trending', { signal });

export const getGenreRows = (region, signal) => {
  const params = new URLSearchParams({ region });
  return request(`/api/genres?${params}`, { signal });
};

export const getRegionalPicks = (region, signal) => {
  const params = new URLSearchParams({ region });
  return request(`/api/picks?${params}`, { signal });
};

export const getTitleDetails = (movie, region, signal) => {
  const params = new URLSearchParams({ region });
  return request(`/api/title/${movie.mediaType}/${movie.tmdbId}?${params}`, { signal });
};

export const getRegionCode = (region) => ({
  global: 'US',
  us: 'US',
  uk: 'GB',
  eu: 'FR',
  asia: 'JP',
}[region] || 'US');