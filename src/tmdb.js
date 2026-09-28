async function request(path, options = {}) {
  const response = await fetch(path, options);
  const contentType = response.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response for', path, ':', text.slice(0, 200));
    throw new Error(`Could not load trailer (${response.status})`);
  }

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load movie data.');
  return result;
}

const normalizeType = (m = {}) => {
  const raw = String(m.mediaType || m.media_type || m.type || '').toLowerCase();
  if (['tv', 'series', 'show'].includes(raw)) return 'series';
  if (['movie', 'film'].includes(raw)) return 'movie';
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

// FIXED: uses your working /api/title/[type]/[id] endpoint
// That JSON already contains trailerUrl
export const getTitleTrailer = async (movie, signal) => {
  // 1. If we already have trailer from card/detail, reuse it (instant)
  if (movie?.trailerUrl) {
    return {
      trailerUrl: movie.trailerUrl,
      videoTitle: movie.videoTitle || `${movie.title} trailer`,
    };
  }

  const type = normalizeType(movie);
  const id = getId(movie);
  
  if (!id) throw new Error('Missing movie id');

  try {
    // Try dedicated trailer route first if it exists locally
    const trailerData = await request(`/api/title/${type}/${id}/trailer`, { signal });
    // Your trailer route might return { trailerUrl } or { trailer: { trailerUrl } }
    if (trailerData?.trailerUrl) return trailerData;
    if (trailerData?.trailer?.trailerUrl) return trailerData.trailer;
    if (trailerData) return trailerData;
  } catch (e) {
    // In production /trailer doesn't exist and returns HTML -> falls here
    console.warn('Trailer sub-route failed, falling back to detail endpoint', e.message);
  }

  // 2. Fallback: get full detail (this works on prod - you tested it)
  const detail = await request(`/api/title/${type}/${id}`, { signal });
  
  if (!detail?.trailerUrl) {
    throw new Error('No trailer available.');
  }

  return {
    trailerUrl: detail.trailerUrl,
    videoTitle: detail.videoTitle || `${detail.title} trailer`,
  };
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