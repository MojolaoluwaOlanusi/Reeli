async function request(path, options = {}) {
  const response = await fetch(path, options);
  const contentType = response.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response:', text.slice(0,200));
    throw new Error(`Could not load trailer (${response.status})`);
  }

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load movie data.');
  return result;
}

const normalizeType = (m = {}) => {
  const raw = String(m.mediaType || m.media_type || m.type || '').toLowerCase();
  if (['tv','series','show'].includes(raw)) return 'series';
  if (['movie','film'].includes(raw)) return 'movie';
  // fallback from TMDB fields
  if (m.first_air_date || m.firstAirDate) return 'series';
  return 'movie';
};

const getId = (m) => m.tmdbId || m.id;

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
export const getDetectedCountry = (signal) => request('/api/location', { signal });

export const getTitleTrailer = (movie, signal) => {
  const type = normalizeType(movie);
  const id = getId(movie);
  return request(`/api/title/${type}/${id}/trailer`, { signal });
};

export const getTitleDetails = (movie, region, signal) => {
  const params = new URLSearchParams({ region });
  const type = normalizeType(movie);
  const id = getId(movie);
  return request(`/api/title/${type}/${id}?${params}`, { signal });
};

export const getRegionCode = (region) => ({
  us: 'US', uk: 'GB', eu: 'FR', asia: 'JP',
}[String(region).toLowerCase()] || (/^[A-Za-z]{2}$/.test(String(region)) ? String(region).toUpperCase() : 'US'));