import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
const app = express();
const httpServer = createServer(app);
const cache = new Map();
const cacheDuration = 10 * 60 * 1000;
const genres = {
  12: 'Adventure', 14: 'Fantasy', 16: 'Animation', 18: 'Drama', 27: 'Horror',
  28: 'Action', 35: 'Comedy', 36: 'History', 37: 'Western', 53: 'Thriller',
  80: 'Crime', 99: 'Documentary', 878: 'Science Fiction', 9648: 'Mystery',
  10402: 'Music', 10749: 'Romance', 10751: 'Family', 10752: 'War', 10759: 'Action & Adventure',
  10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 10770: 'TV Movie',
};

function hasTmdbToken(response) {
  if (process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY) return true;
  response.status(503).json({
    error: 'TMDB is not configured. Set TMDB_API_READ_ACCESS_TOKEN or TMDB_API_KEY on the server.',
  });
  return false;
}

async function tmdb(pathname, params) {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY;

  const url = new URL(`https://api.themoviedb.org/3${pathname}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  }

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  if (!process.env.TMDB_API_READ_ACCESS_TOKEN) {
    url.searchParams.set('api_key', token);
  }

  const result = await fetch(url, {
    headers: process.env.TMDB_API_READ_ACCESS_TOKEN
      ? { Authorization: `Bearer ${token}`, accept: 'application/json' }
      : { accept: 'application/json' },
  });

  if (!result.ok) {
    const error = new Error(result.status === 401
      ? 'TMDB rejected the configured credential. Replace it with a valid TMDB API Read Access Token or API key.'
      : `TMDB request failed (${result.status}).`);
    error.status = result.status === 401 ? 502 : result.status;
    throw error;
  }

  const value = await result.json();
  cache.set(cacheKey, { value, expiresAt: Date.now() + cacheDuration });
  return value;
}

function normalizeTitle(item, mediaType = item.media_type) {
  if (!['movie', 'tv'].includes(mediaType)) return null;

  const releaseDate = item.release_date || item.first_air_date || '';
  const genreIds = (item.genres || item.genre_ids || []).map((genre) =>
    typeof genre === 'number' ? genre : genre.id,
  );
  const isAnime = item.original_language === 'ja' && genreIds.includes(16);
  return {
    id: `${mediaType}-${item.id}`,
    tmdbId: item.id,
    mediaType,
    title: item.title || item.name || 'Untitled',
    tagline: item.tagline || '',
    summary: item.overview || 'No overview is available for this title.',
    releaseDate,
    runtime: item.runtime || item.episode_run_time?.[0] || null,
    genres: (item.genres || item.genre_ids || []).map((genre) =>
      typeof genre === 'number' ? genres[genre] : genre.name,
    ).filter(Boolean),
    tags: [],
    directors: [],
    actors: [],
    producers: [],
    poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : '',
    trailerUrl: '',
    videoTitle: '',
    contentType: isAnime ? (mediaType === 'tv' ? 'Anime Series' : 'Anime') : (mediaType === 'tv' ? 'Series' : 'Movie'),
    isAnime,
    hasManga: null,
    hasManhwa: null,
    isSeries: mediaType === 'tv',
    seriesStatus: mediaType === 'tv' ? (item.status || 'Status unavailable') : '',
    whereToWatch: [],
    related: [],
    voteAverage: item.vote_average || null,
  };
}

app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/api/health', (_request, response) => {
  response.json({ tmdbConfigured: Boolean(process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY) });
});

app.get('/api/trending', async (request, response, next) => {
  if (!hasTmdbToken(response)) return;
  try {
    const result = await tmdb('/trending/all/week', { language: 'en-US' });
    response.json((result.results || []).map(normalizeTitle).filter(Boolean).slice(0, 12));
  } catch (error) {
    next(error);
  }
});

app.get('/api/search', async (request, response, next) => {
  const query = String(request.query.q || '').trim();
  if (!query) {
    response.json([]);
    return;
  }
  if (!hasTmdbToken(response)) return;

  try {
    const [multi, people, keywords] = await Promise.all([
      tmdb('/search/multi', { query: query.slice(0, 100), include_adult: 'false', language: 'en-US', page: '1' }),
      tmdb('/search/person', { query: query.slice(0, 100), include_adult: 'false', language: 'en-US', page: '1' }),
      tmdb('/search/keyword', { query: query.slice(0, 100), page: '1' }),
    ]);

    const personIds = (people.results || []).slice(0, 3).map((person) => person.id).join('|');
    const keywordIds = (keywords.results || []).slice(0, 3).map((keyword) => keyword.id).join('|');
    const discovered = [];
    if (personIds) {
      discovered.push(...await Promise.all([
          tmdb('/discover/movie', { with_people: personIds, sort_by: 'popularity.desc', page: '1' }),
          tmdb('/discover/tv', { with_people: personIds, sort_by: 'popularity.desc', page: '1' }),
        ]));
    }
    if (keywordIds) {
      discovered.push(...await Promise.all([
        tmdb('/discover/movie', { with_keywords: keywordIds, sort_by: 'popularity.desc', page: '1' }),
        tmdb('/discover/tv', { with_keywords: keywordIds, sort_by: 'popularity.desc', page: '1' }),
      ]));
    }

    const titles = [
      ...(multi.results || []),
      ...discovered.flatMap((result) => result.results || []),
    ];
    const seen = new Set();
    const normalized = titles
      .map((item) => normalizeTitle(item))
      .filter((item) => {
        if (!item || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 30);

    response.json(normalized);
  } catch (error) {
    next(error);
  }
});

app.get('/api/title/:mediaType/:id', async (request, response, next) => {
  const { mediaType, id } = request.params;
  if (!['movie', 'tv'].includes(mediaType) || !/^\d+$/.test(id)) {
    response.status(400).json({ error: 'Invalid title identifier.' });
    return;
  }
  if (!hasTmdbToken(response)) return;

  try {
    const requestedRegion = String(request.query.region || 'US').toUpperCase();
    const region = /^[A-Z]{2}$/.test(requestedRegion) ? requestedRegion : 'US';
    const item = await tmdb(`/${mediaType}/${id}`, {
      language: 'en-US',
      append_to_response: 'credits,videos,watch/providers,recommendations,keywords',
    });

    const title = normalizeTitle(item, mediaType);
    const credits = item.credits || {};
    title.directors = mediaType === 'movie'
      ? (credits.crew || []).filter((person) => person.job === 'Director').map((person) => person.name)
      : (item.created_by || []).map((person) => person.name);
    title.actors = (credits.cast || []).slice(0, 12).map((person) => person.name);
    title.producers = (credits.crew || [])
      .filter((person) => ['Producer', 'Executive Producer'].includes(person.job))
      .slice(0, 8)
      .map((person) => person.name);

    const videos = item.videos?.results || [];
    const trailer = videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer')
      || videos.find((video) => video.site === 'YouTube' && video.type === 'Teaser');
    if (trailer) {
      title.trailerUrl = `https://www.youtube-nocookie.com/embed/${trailer.key}`;
      title.videoTitle = trailer.name;
    }

    const providerData = item['watch/providers']?.results?.[region];
    const providers = [
      ...(providerData?.flatrate || []),
      ...(providerData?.free || []),
      ...(providerData?.ads || []),
      ...(providerData?.rent || []),
      ...(providerData?.buy || []),
    ];
    title.whereToWatch = [...new Map(providers.map((provider) => [provider.provider_id, provider])).values()]
      .map((provider) => ({ name: provider.provider_name, url: providerData.link || `https://www.themoviedb.org/${mediaType}/${id}/watch?locale=${region}` }));
    title.related = (item.recommendations?.results || []).map((related) => normalizeTitle(related, mediaType)).filter(Boolean).slice(0, 8);
    title.seriesStatus = mediaType === 'tv'
      ? `${item.status || 'Status unavailable'}${item.number_of_seasons ? ` · ${item.number_of_seasons} seasons` : ''}`
      : (item.belongs_to_collection?.name ? `Part of ${item.belongs_to_collection.name}` : 'Standalone title');
    title.hasManga = null;
    title.hasManhwa = null;
    title.detailsLoaded = true;

    response.json(title);
  } catch (error) {
    next(error);
  }
});

app.use('/api', (error, _request, response, next) => {
  if (response.headersSent) return next(error);
  response.status(error.status || 502).json({ error: error.message || 'The movie data service is unavailable.' });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath, { index: false }));
  app.use((request, response, next) => {
    if (request.method !== 'GET') return next();
    response.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  const vite = await createViteServer({
    configFile: path.join(__dirname, 'vite.config.js'),
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

const port = Number(process.env.PORT || 5173);
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Reeli server listening on http://localhost:${port}`);
});