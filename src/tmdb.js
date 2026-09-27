async function request(path, options = {}) {
  const response = await fetch(path, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load movie data.');
  return result;
}

export const searchTitles = (query, signal) => {
  const params = new URLSearchParams({ q: query });
  return request(`/api/search?${params}`, { signal });
};

export const getTrendingTitles = (signal) => request('/api/trending', { signal });

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