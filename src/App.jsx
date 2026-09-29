import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import Search from './components/search.jsx';
import MovieCard from './components/MovieCard.jsx';
import MovieDetail from './components/MovieDetail.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { auth, getUserInteractions, interactionStoreConfigured, recordUserInteraction } from './appwrite.js';
import { getDetectedCountry, getGenreRows, getRegionCode, getRegionalPicks, getTitleDetails, getTrendingTitles, searchTitles } from './tmdb.js';

const DEFAULT_SETTINGS = {
  region: 'auto',
  theme: 'light',
  saveHistory: true,
  showGuides: false,
};

const readStoredValue = (key, fallback) => {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
};

const moviePath = (movie) => `/movies/${movie.mediaType}/${movie.tmdbId}`;
const localDateKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getBrowserCountryCode = () => {
  try {
    return new Intl.Locale(navigator.language).region || 'US';
  } catch {
    return 'US';
  }
};
const movieKey = (movie) => `${movie.mediaType}:${movie.tmdbId}`;

const getGuestMoviesViewedToday = () => {
  const record = readStoredValue('reeli.guestDetails', null);
  return record?.date === localDateKey() && Array.isArray(record.movies) ? record.movies : [];
};

const canGuestViewMovie = (movie) => {
  const viewed = getGuestMoviesViewedToday();
  return viewed.includes(movieKey(movie)) || viewed.length < 3;
};

const rememberGuestMovieView = (movie) => {
  const viewed = getGuestMoviesViewedToday();
  const key = movieKey(movie);
  if (viewed.includes(key) || viewed.length >= 3) return viewed;
  const updated = [...viewed, key];
  try {
    window.localStorage.setItem('reeli.guestDetails', JSON.stringify({ date: localDateKey(), movies: updated }));
  } catch {
    // Enforce the daily preview allowance when browser storage is available.
  }
  return updated;
};

const getCountryName = (countryCode) => {
  if (!countryCode || countryCode === 'auto') return 'your country';
  try {
    const code = /^[a-z]{2}$/i.test(countryCode) ? countryCode.toUpperCase() : countryCode;
    return new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(code) || code;
  } catch {
    return countryCode;
  }
};

const scorePicksFromInteractions = (movies, interactions) => {
  if (!interactions.length) return movies;

  const genreAffinity = new Map();
  const seenKeys = new Set();
  interactions.forEach((interaction) => {
    const daysAgo = Math.max(0, (Date.now() - new Date(interaction.lastInteractedAt).getTime()) / 86400000);
    const recency = Number.isFinite(daysAgo) ? Math.exp(-daysAgo / 60) : 0.5;
    const weight = (Math.min(interaction.detailViews || 0, 8) + Math.min(interaction.watchClicks || 0, 8) * 3) * recency;
    if (weight <= 0) return;

    seenKeys.add(interaction.movieKey);
    (interaction.genres || []).forEach((genre) => {
      genreAffinity.set(genre, (genreAffinity.get(genre) || 0) + weight);
    });
  });

  return [...movies].sort((left, right) => {
    const score = (movie) => {
      const interest = (movie.genres || []).reduce((total, genre) => total + (genreAffinity.get(genre) || 0), 0);
      const alreadyOpened = seenKeys.has(`${movie.mediaType}:${movie.tmdbId}`) ? 1.5 : 0;
      return (movie.voteAverage || 5) + interest * 0.8 - alreadyOpened;
    };
    return score(right) - score(left);
  });
};

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Reeli home">
      <span className="brand-word"><span>reel</span><span className="brand-i"><img src="/reeli-mark.svg" alt="" /><span className="brand-i-stem" /></span></span>
    </Link>
  );
}

function AuthGate({ onSignIn, error, onClose }) {
  return (
    <div className="auth-overlay" role="presentation" onClick={onClose}>
      <section className="auth-gate" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button auth-close" type="button" onClick={onClose} aria-label="Close sign in">×</button>
        <img className="auth-mark" src="/reeli-icon.svg" alt="" />
        <p className="eyebrow">Your watchlist starts here</p>
        <h2 id="auth-title">Sign in to explore the full story.</h2>
        <p className="auth-copy">Create an account or sign in with Google to open movie and series details.</p>
        <button className="button button--yellow auth-continue" type="button" onClick={onSignIn}>Continue with Google</button>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <p className="auth-terms">Continuing means you agree to use Reeli responsibly.</p>
      </section>
    </div>
  );
}

function Header({ user, theme, onThemeToggle, onSignIn, onSignOut, onSettings }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!accountRef.current?.contains(event.target)) setAccountOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="site-header">
      <Brand />
      <nav className="main-nav" aria-label="Main navigation">
        <Link to="/">Discover</Link>
        <a href="/#genres">Genres</a>
      </nav>
      <div className="header-actions">
        <button className="icon-button theme-toggle" type="button" onClick={onThemeToggle} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? '☾' : '☼'}
        </button>
        <button className="icon-button settings-toggle" type="button" onClick={onSettings} aria-label="Open settings" title="Settings">⚙</button>
        {user ? (
          <div className="account-area" ref={accountRef}>
            <button
              className={`account-trigger${accountOpen ? ' is-open' : ''}`}
              type="button"
              aria-expanded={accountOpen}
              aria-haspopup="dialog"
              onClick={() => setAccountOpen((open) => !open)}
            >
              <span className="account-initial">{user.name?.charAt(0)?.toUpperCase() || 'R'}</span>
              <span className="account-name">{user.name || 'Reeli member'}</span>
            </button>
            {accountOpen && <section className="account-popover" aria-label="Account details">
              <div className="account-popover-heading">
                <span className="account-initial account-initial--large">{user.name?.charAt(0)?.toUpperCase() || 'R'}</span>
                <div><strong>{user.name || 'Reeli member'}</strong><span>Signed in to Reeli</span></div>
              </div>
              <div className="account-email-label">EMAIL ADDRESS</div>
              <div className="account-email">{user.email || 'Email unavailable'}</div>
              <div className="account-popover-divider" />
              <button className="settings-action" type="button" onClick={() => { setAccountOpen(false); onSettings(); }}>
                <span>⚙</span>
                <span>Settings</span>
              </button>
              <button className="signout-action" type="button" onClick={() => { setAccountOpen(false); onSignOut(); }}>
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </section>}
          </div>
        ) : (
          <button className="button button--yellow header-signin" type="button" onClick={onSignIn}>Sign in</button>
        )}
      </div>
    </header>
  );
}

function MovieRail({ title, subtitle, movies, onSelect }) {
  const railRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const track = railRef.current;
    if (!track) return undefined;

    const updateEdges = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      setEdges({ start: track.scrollLeft <= 1, end: maxScroll <= 1 || track.scrollLeft >= maxScroll - 1 });
    };
    updateEdges();
    track.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      track.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [movies?.length]);

  if (!movies?.length) return null;

  const scrollRail = (direction) => {
    const track = railRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.78, 300), behavior: 'smooth' });
  };

  return (
    <section className="movie-rail">
      <div className="rail-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="rail-controls">
          <span className="rail-count">{movies.length} titles</span>
          <button className="rail-arrow" type="button" disabled={edges.start} onClick={() => scrollRail(-1)} aria-label={`Scroll ${title} left`} title="Scroll left"><ChevronLeft size={19} strokeWidth={2.5} /></button>
          <button className="rail-arrow" type="button" disabled={edges.end} onClick={() => scrollRail(1)} aria-label={`Scroll ${title} right`} title="Scroll right"><ChevronRight size={19} strokeWidth={2.5} /></button>
        </div>
      </div>
      <div className="rail-track" ref={railRef}>
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} variant="rail" onSelect={() => onSelect(movie)} />
        ))}
      </div>
    </section>
  );
}

function HomePage({
  user, countryCode, guestViewsUsed, searchTerm, recentSearches, showSearchHistory, setShowSearchHistory,
  onSearch, onClearHistory, onSelectMovie, picks, trending, genreRows, interactions,
  isLoading, error, interactionError,
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroCandidates = useMemo(() => {
    const seen = new Set();
    return [...trending, ...picks].filter((movie) => {
      if (!movie || seen.has(movie.id)) return false;
      seen.add(movie.id);
      return true;
    }).slice(0, 6);
  }, [trending, picks]);
  const heroMovie = heroCandidates.length ? heroCandidates[heroIndex % heroCandidates.length] : null;
  const locationLabel = getCountryName(countryCode);
  const tailoredPicks = useMemo(() => scorePicksFromInteractions(picks, interactions), [picks, interactions]);
  const interactionCount = interactions.reduce((total, item) => total + (item.detailViews || 0) + (item.watchClicks || 0), 0);
  const pickSubtitle = interactionCount
    ? `Ranked from your ${interactionCount} movie and watch interactions`
    : `Popular with viewers in ${locationLabel}${user ? ` · Welcome back, ${user.name?.split(' ')[0] || 'there'}` : ''}`;

  useEffect(() => {
    if (heroCandidates.length < 2) {
      setHeroIndex(0);
      return undefined;
    }
    const interval = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroCandidates.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [heroCandidates.length]);

  return (
    <>
      <section className="hero">
        <div key={heroMovie?.id || 'reeli-hero'} className="hero-art" style={heroMovie?.backdrop ? { backgroundImage: `url("${heroMovie.backdrop}")` } : undefined} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow">Stories worth staying in for</p>
          <h1>{heroMovie ? <>Find your next<br /><em>great watch.</em></> : <>A good story<br /><em>finds you.</em></>}</h1>
          <p className="hero-description">{heroMovie?.summary || 'Explore the movies, anime, and series everyone is talking about.'}</p>
          {heroMovie && <div className="hero-feature-meta"><span>{heroMovie.releaseDate?.slice(0, 4) || 'New discovery'}</span><span>{heroMovie.contentType}</span>{heroMovie.voteAverage > 0 && <span>★ {heroMovie.voteAverage.toFixed(1)}</span>}</div>}
          <div className="hero-search">
            <Search
              searchTerm={searchTerm}
              setSearchTerm={onSearch}
              recentSearches={recentSearches}
              showSearchHistory={showSearchHistory}
              onFocus={() => setShowSearchHistory(true)}
              onSelectRecent={(value) => { onSearch(value); setShowSearchHistory(false); }}
              onClearHistory={onClearHistory}
            />
          </div>
          {heroMovie && <button className="button button--yellow hero-cta" type="button" onClick={() => onSelectMovie(heroMovie)}>Explore this title <ArrowUpRight size={18} strokeWidth={2.5} aria-hidden="true" /></button>}
          {!user && <p className="guest-preview-count">{guestViewsUsed} of 3 free title details used today</p>}
          {heroCandidates.length > 1 && <div className="hero-pagination" aria-label="Featured titles">{heroCandidates.slice(0, 6).map((movie, index) => <button key={movie.id} className={index === heroIndex % heroCandidates.length ? 'is-active' : ''} type="button" aria-label={`Show featured title ${index + 1}: ${movie.title}`} aria-current={index === heroIndex % heroCandidates.length ? 'true' : undefined} onClick={() => setHeroIndex(index)} />)}</div>}
        </div>
        {heroMovie && <div className="hero-caption"><span>THIS WEEK ON REELI</span><strong>{heroMovie.title}</strong></div>}
      </section>

      <div className="browse-content">
        {error && <p className="api-alert" role="alert">{error}</p>}
        {interactionError && <p className="api-alert" role="status">{interactionError}</p>}
        {user && !interactionStoreConfigured && <p className="interaction-note" role="status">Top picks currently use regional popularity. Add the Appwrite interaction database and table to personalize them from your activity.</p>}
        <MovieRail
          title="Top picks for you"
          subtitle={pickSubtitle}
          movies={tailoredPicks}
          onSelect={onSelectMovie}
        />
        {isLoading && <p className="loading-label">Finding your next watch...</p>}
        <div className="genre-section" id="genres">
          <div className="genre-intro">
            <p className="eyebrow">The good stuff, sorted</p>
            <h2>Pick a feeling.<br /><em>Find a film.</em></h2>
          </div>
          {genreRows.map((row) => <MovieRail key={row.name} title={row.name} movies={row.titles} onSelect={onSelectMovie} />)}
          {!genreRows.length && error && <p className="empty-copy">Genre collections will appear when the movie service is available.</p>}
        </div>
        <footer className="site-footer flex flex-col items-center gap-2 py-6 text-sm text-zinc-400">
          <p>This product uses the <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline hover:text-white">TMDB API</a> but is not endorsed or certified by TMDB.</p>
          <p>© {new Date().getFullYear()} Built with care by Mojolaoluwa</p>
        </footer>
      </div>
    </>
  );
}

function SearchResultsPage({ query, searchTerm, recentSearches, showSearchHistory, onSearch, onFocus, onSelectRecent, onClearHistory, movies, loading, error, onSelect }) {
  return (
    <main className="browse-content search-results-page">
      <p className="eyebrow">Search Reeli</p>
      <h1>Results for <em>“{query}”</em></h1>
      <div className="results-search"><Search searchTerm={searchTerm} setSearchTerm={onSearch} recentSearches={recentSearches} showSearchHistory={showSearchHistory} onFocus={onFocus} onSelectRecent={onSelectRecent} onClearHistory={onClearHistory} /></div>
      {error && <p className="api-alert" role="alert">{error}</p>}
      {loading ? <p className="loading-label">Searching...</p> : movies.length ? (
        <div className="search-results-grid">{movies.map((movie) => <MovieCard key={movie.id} movie={movie} onSelect={() => onSelect(movie)} />)}</div>
      ) : <p className="empty-copy">No matches yet. Try a title, actor, director, or genre.</p>}
    </main>
  );
}

function MovieRoute({ user, checkingSession, region, authError, onSignIn, onSelectMovie, onRecordInteraction, onGuestView }) {
  const navigate = useNavigate();
  const { mediaType, id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const guestViewAllowed = Boolean(user) || canGuestViewMovie({ mediaType, tmdbId: id });
  const recordedViewKey = useRef('');
  const interactionHandler = useRef(onRecordInteraction);
  const guestViewHandler = useRef(onGuestView);

  useEffect(() => {
    interactionHandler.current = onRecordInteraction;
  }, [onRecordInteraction]);

  useEffect(() => {
    guestViewHandler.current = onGuestView;
  }, [onGuestView]);

  useEffect(() => {
    if (checkingSession || (!user && !guestViewAllowed)) {
      setMovie(null);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getTitleDetails({ mediaType, tmdbId: id }, getRegionCode(region), controller.signal)
      .then((details) => {
        setMovie(details);
        const viewKey = user
          ? `${user.$id}:${details.mediaType}:${details.tmdbId}`
          : `guest:${localDateKey()}:${details.mediaType}:${details.tmdbId}`;
        if (recordedViewKey.current !== viewKey) {
          recordedViewKey.current = viewKey;
          if (user) interactionHandler.current?.(details, 'detail_view');
          else guestViewHandler.current?.(details);
        }
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mediaType, id, user, checkingSession, region, guestViewAllowed]);

  if (checkingSession) return <main className="detail-loading">Checking your Reeli account...</main>;
  if (!user && !guestViewAllowed) return <main className="detail-loading"><AuthGate error={authError || 'You have used your three free movie details for today. Sign in to keep exploring.'} onClose={() => navigate('/')} onSignIn={() => onSignIn(`/movies/${mediaType}/${id}`)} /></main>;
  if (loading) return <main className="detail-loading">Loading title details...</main>;
  if (error || !movie) return <main className="detail-loading"><p className="api-alert" role="alert">{error || 'This title could not be found.'}</p><Link className="button button--dark" to="/">Back to discovery</Link></main>;

  return <MovieDetail
    movie={movie}
    relatedMovies={movie.related || []}
    onBack={() => navigate('/')}
    onMovieSelect={onSelectMovie}
    onWatchClick={() => interactionHandler.current?.(movie, 'watch_click')}
  />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [countryCode, setCountryCode] = useState(getBrowserCountryCode);
  const [guestViewsToday, setGuestViewsToday] = useState(getGuestMoviesViewedToday);
  const [interactions, setInteractions] = useState([]);
  const [interactionError, setInteractionError] = useState('');
  const [interactionRevision, setInteractionRevision] = useState(0);
  const [settings, setSettings] = useState(() => {
    const saved = readStoredValue('reeli.settings', {});
    return { ...DEFAULT_SETTINGS, ...saved, theme: ['light', 'dark'].includes(saved.theme) ? saved.theme : DEFAULT_SETTINGS.theme };
  });
  const [recentSearches, setRecentSearches] = useState(() => readStoredValue('reeli.recentSearches', []));
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [trending, setTrending] = useState([]);
  const [picks, setPicks] = useState([]);
  const [genreRows, setGenreRows] = useState([]);
  const [homeError, setHomeError] = useState('');
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authRedirect, setAuthRedirect] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    auth.handleOAuthCallback().then(() => {
      auth.checkSession().then(setUser)
    })
  }, [])

  useEffect(() => {
    let active = true;
    let checking = false;
    let sessionVerified = false;
    let oauthReturnPending = false;
    const authResult = new URLSearchParams(window.location.search).get('auth');
    oauthReturnPending = authResult === 'returned';

    const clearAuthResult = () => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('auth');
      window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    };

    const refreshSession = async (initialCheck = false) => {
      if (checking || sessionVerified) return;
      checking = true;
      let sessionUser = null;
      let sessionError = null;
      const attempts = oauthReturnPending ? 4 : 1;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          sessionUser = await auth.checkSession();
          if (sessionUser || !oauthReturnPending) break;
        } catch (error) {
          sessionError = error;
          if (!oauthReturnPending) break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
      }

      if (active) {
        if (sessionUser) {
          sessionVerified = true;
          setUser({ $id: sessionUser.$id, name: sessionUser.name, email: sessionUser.email });
          setAuthError('');
          setShowAuth(false);
        } else if (oauthReturnPending) {
          setAuthError('Google returned to Reeli, but Appwrite could not restore the session. Check that the exact Reeli website domain is registered as a Web platform in Appwrite. On iPhone, complete the flow in Safari rather than an embedded browser.');
          setShowAuth(true);
        } else if (sessionError) {
          setAuthError(`Could not verify your Reeli session: ${sessionError.message}`);
        }
        if (initialCheck) setCheckingSession(false);
      }

      if (oauthReturnPending) {
        oauthReturnPending = false;
        clearAuthResult();
      }
      checking = false;
    };

    if (authResult === 'failed') {
      setAuthError('Google sign-in did not complete. Check the OAuth redirect URI and Appwrite Web platform settings.');
      setShowAuth(true);
      clearAuthResult();
    }

    const onReturnToPage = () => {
      if (document.visibilityState === 'visible') refreshSession();
    };
    window.addEventListener('pageshow', onReturnToPage);
    window.addEventListener('focus', onReturnToPage);
    document.addEventListener('visibilitychange', onReturnToPage);
    refreshSession(true);

    return () => {
      active = false;
      window.removeEventListener('pageshow', onReturnToPage);
      window.removeEventListener('focus', onReturnToPage);
      document.removeEventListener('visibilitychange', onReturnToPage);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getDetectedCountry(controller.signal)
      .then(({ countryCode: detected }) => {
        if (detected && /^[A-Z]{2}$/.test(detected)) setCountryCode(detected);
      })
      .catch(() => {
        // The browser locale country remains the fallback outside supported edge hosts.
      });
    return () => controller.abort();
  }, []);

  const userId = user?.$id;

  useEffect(() => {
    if (!userId || !interactionStoreConfigured) {
      setInteractions([]);
      return undefined;
    }

    let active = true;
    getUserInteractions(userId)
      .then((documents) => {
        if (active) {
          setInteractions(documents);
          setInteractionError('');
        }
      })
      .catch((error) => {
        if (active) setInteractionError(`Could not load your Reeli activity: ${error.message}`);
      });

    return () => { active = false; };
  }, [userId, interactionRevision]);

  useEffect(() => {
    try {
      window.localStorage.setItem('reeli.settings', JSON.stringify(settings));
      if (settings.saveHistory) window.localStorage.setItem('reeli.recentSearches', JSON.stringify(recentSearches));
      else window.localStorage.removeItem('reeli.recentSearches');
    } catch {
      // Browser storage can be unavailable in restricted contexts.
    }
  }, [settings, recentSearches]);

  useEffect(() => {
    const controller = new AbortController();
    const region = getRegionCode(settings.region === 'auto' ? countryCode : settings.region);
    Promise.all([getTrendingTitles(controller.signal), getRegionalPicks(region, controller.signal), getGenreRows(region, controller.signal)])
      .then(([nextTrending, nextPicks, nextRows]) => {
        setTrending(nextTrending);
        setPicks(nextPicks);
        setGenreRows(nextRows);
        setHomeError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setHomeError(error.message);
      });
    return () => controller.abort();
  }, [settings.region, countryCode]);

  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      setIsSearching(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearchLoading(true);
      setSearchError('');
      setIsSearching(true);
      searchTitles(query, controller.signal)
        .then((results) => {
          setSearchResults(results);
          if (settings.saveHistory) {
            setRecentSearches((previous) => [query, ...previous.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 8));
          }
        })
        .catch((error) => {
          if (error.name !== 'AbortError') setSearchError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchTerm, settings.saveHistory]);

  const applySetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const recordGuestView = (movie) => {
    setGuestViewsToday(rememberGuestMovieView(movie));
  };

  const recordInteraction = async (movie, interactionType) => {
    if (!userId || !interactionStoreConfigured) return;
    try {
      await recordUserInteraction(userId, movie, interactionType);
      setInteractionRevision((revision) => revision + 1);
      setInteractionError('');
    } catch (error) {
      setInteractionError(`Could not save your Reeli activity: ${error.message}`);
    }
  };

  const selectMovie = (movie) => {
    if (!movie?.mediaType || !movie?.tmdbId) return;
    if (!user && !canGuestViewMovie(movie)) {
      setAuthRedirect(moviePath(movie));
      setAuthError('You have used your three free movie details for today. Sign in to keep exploring.');
      setShowAuth(true);
      return;
    }
    setAuthRedirect(moviePath(movie));
    navigate(moviePath(movie));
  };

  const handleSignIn = async (redirectTo = authRedirect || location.pathname) => {
    setAuthError('');
    const callback = new URL(redirectTo || '/', window.location.origin);
    callback.searchParams.set('auth', 'returned');
    try {
      await auth.signInWithGoogle(callback.toString());
    } catch (error) {
      setAuthError(error.message || 'Sign in could not start. Check the Appwrite setup.');
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    navigate('/');
  };

  const clearHistory = () => {
    setRecentSearches([]);
    try { window.localStorage.removeItem('reeli.recentSearches'); } catch { /* Ignore unavailable browser storage. */ }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setShowSearchHistory(true);
    if (location.pathname !== '/') navigate('/');
  };

  return (
    <div className={`app-shell theme-${settings.theme}`}>
      <Header
        user={user}
        theme={settings.theme}
        onThemeToggle={() => applySetting('theme', settings.theme === 'light' ? 'dark' : 'light')}
        onSignIn={() => { setAuthRedirect(location.pathname); setShowAuth(true); }}
        onSignOut={signOut}
        onSettings={() => setShowSettings(true)}
      />
      <Routes>
        <Route path="/" element={isSearching
          ? <SearchResultsPage query={searchTerm} searchTerm={searchTerm} recentSearches={recentSearches} showSearchHistory={showSearchHistory} onSearch={handleSearch} onFocus={() => setShowSearchHistory(true)} onSelectRecent={(value) => { setSearchTerm(value); setShowSearchHistory(false); }} onClearHistory={clearHistory} movies={searchResults} loading={searchLoading} error={searchError} onSelect={selectMovie} />
          : <HomePage user={user} countryCode={settings.region === 'auto' ? countryCode : settings.region} guestViewsUsed={guestViewsToday.length} searchTerm={searchTerm} recentSearches={recentSearches} showSearchHistory={showSearchHistory} setShowSearchHistory={setShowSearchHistory} onSearch={handleSearch} onClearHistory={clearHistory} onSelectMovie={selectMovie} picks={picks} trending={trending} genreRows={genreRows} interactions={interactions} interactionError={interactionError} isLoading={checkingSession && !picks.length} error={homeError} />}
        />
        <Route path="/movies/:mediaType/:id" element={<MovieRoute user={user} checkingSession={checkingSession} region={getRegionCode(settings.region === 'auto' ? countryCode : settings.region)} authError={authError} onSignIn={handleSignIn} onSelectMovie={selectMovie} onRecordInteraction={recordInteraction} onGuestView={recordGuestView} />} />
        <Route path="*" element={<main className="detail-loading"><h1>That page wandered off.</h1><Link to="/" className="button button--dark">Back to Reeli</Link></main>} />
      </Routes>
      {showAuth && <AuthGate error={authError} onClose={() => setShowAuth(false)} onSignIn={() => handleSignIn()} />}
      {showSettings && <SettingsPanel settings={settings} countryCode={getCountryName(countryCode)} onChange={applySetting} onClose={() => setShowSettings(false)} />}
      <Analytics />
    </div>
  );
}

export default App;
