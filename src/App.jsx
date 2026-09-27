import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Search from './components/search.jsx';
import MovieCard from './components/MovieCard.jsx';
import MovieDetail from './components/MovieDetail.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { auth } from './appwrite.js';
import { getGenreRows, getRegionCode, getRegionalPicks, getTitleDetails, getTrendingTitles, searchTitles } from './tmdb.js';

const DEFAULT_SETTINGS = {
  region: 'us',
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

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Reeli home">
      <span className="brand-word"><span>reel</span><span className="brand-i">i<img src="/reeli-mark.svg" alt="" /></span></span>
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
          <div className="account-menu">
            <span className="account-initial">{user.name?.charAt(0)?.toUpperCase() || 'R'}</span>
            <span className="account-name">{user.name || 'Reeli member'}</span>
            <button className="text-button" type="button" onClick={onSignOut}>Sign out</button>
          </div>
        ) : (
          <button className="button button--dark header-signin" type="button" onClick={onSignIn}>Sign in</button>
        )}
      </div>
    </header>
  );
}

function MovieRail({ title, subtitle, movies, onSelect }) {
  if (!movies?.length) return null;
  return (
    <section className="movie-rail">
      <div className="rail-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <span className="rail-count">{movies.length} titles</span>
      </div>
      <div className="rail-track">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} variant="rail" onSelect={() => onSelect(movie)} />
        ))}
      </div>
    </section>
  );
}

function HomePage({
  user, settings, searchTerm, recentSearches, showSearchHistory, setShowSearchHistory,
  onSearch, onClearHistory, onSelectMovie, picks, trending, genreRows, isLoading, error,
}) {
  const heroMovie = trending[0] || picks[0];
  const locationLabel = { us: 'the United States', uk: 'the United Kingdom', eu: 'Europe', asia: 'Asia', global: 'your region' }[settings.region] || 'your region';
  const affinity = readStoredValue('reeli.genreAffinity', {});
  const tailoredPicks = useMemo(() => [...picks].sort((left, right) => {
    const score = (movie) => (movie.voteAverage || 0) + (movie.genres || []).reduce((sum, genre) => sum + (affinity[genre] || 0), 0) * 1.5;
    return score(right) - score(left);
  }), [picks, affinity]);

  return (
    <>
      <section className={`hero ${heroMovie?.backdrop ? 'hero--image' : ''}`} style={heroMovie?.backdrop ? { '--hero-image': `url("${heroMovie.backdrop}")` } : undefined}>
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
          {heroMovie && <button className="button button--yellow hero-cta" type="button" onClick={() => onSelectMovie(heroMovie)}>Explore this title <span aria-hidden="true">↗</span></button>}
        </div>
        {heroMovie && <div className="hero-caption"><span>THIS WEEK ON REELI</span><strong>{heroMovie.title}</strong></div>}
      </section>

      <div className="browse-content">
        {error && <p className="api-alert" role="alert">{error}</p>}
        <MovieRail
          title="Top picks for you"
          subtitle={`Popular with viewers in ${locationLabel}${user ? ` · Welcome back, ${user.name?.split(' ')[0] || 'there'}` : ''}`}
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
        <footer className="site-footer">This product uses the <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB API</a> but is not endorsed or certified by TMDB.</footer>
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

function MovieRoute({ user, checkingSession, region, authError, onSignIn, onSelectMovie }) {
  const navigate = useNavigate();
  const { mediaType, id } = useParams();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (checkingSession || !user) {
      setMovie(null);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getTitleDetails({ mediaType, tmdbId: id }, getRegionCode(region), controller.signal)
      .then(setMovie)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mediaType, id, user, checkingSession, region]);

  if (checkingSession) return <main className="detail-loading">Checking your Reeli account...</main>;
  if (!user) return <main className="detail-loading"><AuthGate error={authError} onClose={() => navigate('/')} onSignIn={() => onSignIn(`/movies/${mediaType}/${id}`)} /></main>;
  if (loading) return <main className="detail-loading">Loading title details...</main>;
  if (error || !movie) return <main className="detail-loading"><p className="api-alert" role="alert">{error || 'This title could not be found.'}</p><Link className="button button--dark" to="/">Back to discovery</Link></main>;

  return <MovieDetail movie={movie} relatedMovies={movie.related || []} onBack={() => navigate('/')} onMovieSelect={onSelectMovie} />;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
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
    auth.checkSession().then((sessionUser) => {
      if (sessionUser) setUser({ name: sessionUser.name, email: sessionUser.email });
    }).finally(() => setCheckingSession(false));
  }, []);

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
    const region = getRegionCode(settings.region);
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
  }, [settings.region]);

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

  const selectMovie = (movie) => {
    if (!movie?.mediaType || !movie?.tmdbId) return;
    try {
      const affinity = readStoredValue('reeli.genreAffinity', {});
      (movie.genres || []).forEach((genre) => { affinity[genre] = (affinity[genre] || 0) + 1; });
      window.localStorage.setItem('reeli.genreAffinity', JSON.stringify(affinity));
    } catch {
      // Taste signals improve recommendations when browser storage is available.
    }
    setAuthRedirect(moviePath(movie));
    navigate(moviePath(movie));
  };

  const handleSignIn = async (redirectTo = authRedirect || location.pathname) => {
    setAuthError('');
    const callback = `${window.location.origin}${redirectTo || '/'}`;
    try {
      await auth.signInWithGoogle(callback);
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
          : <HomePage user={user} settings={settings} searchTerm={searchTerm} recentSearches={recentSearches} showSearchHistory={showSearchHistory} setShowSearchHistory={setShowSearchHistory} onSearch={handleSearch} onClearHistory={clearHistory} onSelectMovie={selectMovie} picks={picks} trending={trending} genreRows={genreRows} isLoading={checkingSession && !picks.length} error={homeError} />}
        />
        <Route path="/movies/:mediaType/:id" element={<MovieRoute user={user} checkingSession={checkingSession} region={settings.region} authError={authError} onSignIn={handleSignIn} onSelectMovie={selectMovie} />} />
        <Route path="*" element={<main className="detail-loading"><h1>That page wandered off.</h1><Link to="/" className="button button--dark">Back to Reeli</Link></main>} />
      </Routes>
      {showAuth && <AuthGate error={authError} onClose={() => setShowAuth(false)} onSignIn={() => handleSignIn()} />}
      {showSettings && <SettingsPanel settings={settings} onChange={applySetting} onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;