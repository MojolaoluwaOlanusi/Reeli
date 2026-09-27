import { useEffect, useMemo, useState } from 'react';
import Search from './components/search.jsx';
import Spinner from './components/spinner.jsx';
import MovieCard from './components/MovieCard.jsx';
import MovieDetail from './components/MovieDetail.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { auth } from './appwrite.js';
import { getRegionCode, getTitleDetails, getTrendingTitles, searchTitles } from './tmdb.js';

const DEFAULT_SETTINGS = {
  region: 'global',
  theme: 'midnight',
  streaming: 'all',
  saveHistory: true,
  showGuides: true,
};

const readStoredValue = (key, fallback) => {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMovie, setActiveMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [apiError, setApiError] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => readStoredValue('reeli.recentSearches', []));
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...readStoredValue('reeli.settings', {}),
  }));
  const [movieList, setMovieList] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);

  useEffect(() => {
    const loadSession = async () => {
      const sessionUser = await auth.checkSession();
      if (sessionUser) {
        setUser({
          name: sessionUser.name || 'Reeli User',
          email: sessionUser.email || 'user@reeli.app',
        });
      }
    };

    loadSession();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('reeli.settings', JSON.stringify(settings));
      if (settings.saveHistory) {
        window.localStorage.setItem('reeli.recentSearches', JSON.stringify(recentSearches));
      } else {
        window.localStorage.removeItem('reeli.recentSearches');
        setRecentSearches([]);
      }
    } catch {
      // Storage can be unavailable in private browsing or restricted contexts.
    }
  }, [settings, recentSearches]);

  useEffect(() => {
    const controller = new AbortController();
    getTrendingTitles(controller.signal)
      .then((titles) => {
        setTrendingMovies(titles);
        setMovieList((current) => current.length ? current : titles);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setApiError(error.message);
      });

    return () => controller.abort();
  }, []);

  const updateRecentSearches = (nextSearch) => {
    const trimmed = nextSearch.trim();
    if (!trimmed) return;

    setRecentSearches((previous) => {
      const next = [trimmed, ...previous.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())];
      return next.slice(0, 6);
    });
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setShowSearchHistory(Boolean(value));
  };

  useEffect(() => {
    const query = searchTerm.trim();
    if (!query) {
      setApiError('');
      setMovieList(trendingMovies);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setApiError('');
      try {
        const matches = await searchTitles(query, controller.signal);
        setMovieList(matches);
        if (settings.saveHistory) updateRecentSearches(query);
      } catch (error) {
        if (error.name !== 'AbortError') setApiError(error.message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, settings.region, settings.saveHistory, trendingMovies]);

  const relatedMovies = useMemo(() => {
    return activeMovie?.related || [];
  }, [activeMovie]);

  const applySetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSelectMovie = async (movie) => {
    setShowSearchHistory(false);
    setDetailError('');
    setDetailLoading(true);
    try {
      const details = await getTitleDetails(movie, getRegionCode(settings.region));
      setActiveMovie(details);
    } catch (error) {
      setDetailError(error.message);
      setActiveMovie(movie);
    } finally {
      setDetailLoading(false);
    }
  };

  const clearSearchHistory = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem('reeli.recentSearches');
    } catch {
      // Ignore unavailable browser storage.
    }
  };

  const handleSignIn = async () => {
    try {
      await auth.signInWithGoogle();
      const sessionUser = await auth.checkSession();
      if (sessionUser) {
        setUser({
          name: sessionUser.name || 'Google User',
          email: sessionUser.email || 'user@gmail.com',
        });
      }
    } catch (error) {
      console.error('OAuth sign in failed', error);
    }
  };

  const authPanel = (
    <AuthPanel
      user={user}
      onSignIn={handleSignIn}
      onSignOut={async () => {
        await auth.signOut();
        setUser(null);
      }}
    />
  );

  if (activeMovie) {
    return (
      <main className={`app-shell theme-${settings.theme}`}>
        <div className="app-surface">
          <header className="topbar">
            <div className="brand-block">
              <span className="brand-mark">R</span>
              <span>Reeli</span>
            </div>
            <div className="topbar-actions">
              <button type="button" className="ghost-button" onClick={() => setShowSettings(true)}>
                Settings
              </button>
              {authPanel}
            </div>
          </header>

          <MovieDetail
            movie={activeMovie}
            relatedMovies={relatedMovies}
            loading={detailLoading}
            error={detailError}
            onBack={() => setActiveMovie(null)}
            onMovieSelect={handleSelectMovie}
          />

          {showSettings && (
            <SettingsPanel
              settings={settings}
              onChange={applySetting}
              onClose={() => setShowSettings(false)}
            />
          )}
          <footer className="data-attribution">This product uses the <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB API</a> but is not endorsed or certified by TMDB.</footer>
        </div>
      </main>
    );
  }

  return (
    <main className={`app-shell theme-${settings.theme}`}>
      <div className="app-surface">
        <header className="topbar">
          <div className="brand-block">
            <span className="brand-mark">R</span>
            <span>Reeli</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={() => setShowSettings(true)}>
              Settings
            </button>
            {authPanel}
          </div>
        </header>

        <section className="hero-banner">
          <div className="hero-copy">
            <p className="eyebrow">Everything about the movie you want</p>
            <h1>Find stories, actors, directors, and where to watch.</h1>
            <p className="hero-subtitle">
              Search by title, actor, director, tags, genre, or anime and series status.
            </p>
          </div>
          <div className="search-shell">
            <Search
              searchTerm={searchTerm}
              setSearchTerm={handleSearchChange}
              recentSearches={recentSearches}
              showSearchHistory={showSearchHistory}
              onSelectRecent={(value) => {
                setSearchTerm(value);
                setShowSearchHistory(false);
              }}
              onClearHistory={clearSearchHistory}
            />
          </div>
        </section>

        {settings.showGuides && (
          <section className="guidance-strip">
            <div>
              <strong>Watch guides</strong>
              <span>Anime, series, manga, and streaming availability</span>
            </div>
            <div>
              <strong>Safe search</strong>
              <span>Recent searches and personalized preferences</span>
            </div>
            <div>
              <strong>Smart filters</strong>
              <span>Actor, director, tags, and title discovery</span>
            </div>
          </section>
        )}

        {trendingMovies.length > 0 && (
          <section className="trending">
            <div className="section-header">
              <h2>Trending</h2>
            </div>
            <div className="trending-row">
              {trendingMovies.map((movie, index) => (
                <button type="button" key={movie.id} className="trending-item" onClick={() => handleSelectMovie(movie)}>
                  <span className="rank">{index + 1}</span>
                  <img src={movie.poster} alt={movie.title} />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="results-section">
          <div className="section-header">
            <h2>{searchTerm ? 'Matching titles' : 'Featured picks'}</h2>
          </div>

          {isLoading ? (
            <div className="loading-wrap">
              <Spinner />
            </div>
          ) : (
            <>
              {apiError && <p role="alert">{apiError}</p>}
              {movieList.length ? (
                <div className="movie-grid">
                  {movieList.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} onSelect={() => handleSelectMovie(movie)} />
                  ))}
                </div>
              ) : !apiError && <p>No titles found. Try another title, actor, or director.</p>}
            </>
          )}
        </section>
        <footer className="data-attribution">This product uses the <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB API</a> but is not endorsed or certified by TMDB.</footer>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={applySetting}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
};

export default App;
