import { useEffect, useMemo, useState } from 'react';
import Search from './components/search.jsx';
import Spinner from './components/spinner.jsx';
import MovieCard from './components/MovieCard.jsx';
import MovieDetail from './components/MovieDetail.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import { auth, getTrendingMovies } from './appwrite.js';
import { getMovieById, searchMovieLibrary } from './data.js';

const DEFAULT_SETTINGS = {
  region: 'global',
  theme: 'midnight',
  streaming: 'all',
  saveHistory: true,
  showGuides: true,
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMovieId, setActiveMovieId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([
    'Dune',
    'spider verse',
    'solo leveling',
    'attack on titan',
  ]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [movieList, setMovieList] = useState([]);

  const trendingMovies = useMemo(() => getTrendingMovies(), []);

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
    const timer = setTimeout(() => {
      setIsLoading(true);
      const matches = searchMovieLibrary(searchTerm);
      setMovieList(matches);
      if (searchTerm.trim()) {
        updateRecentSearches(searchTerm);
      }
      setTimeout(() => setIsLoading(false), 150);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setMovieList(searchMovieLibrary(''));
  }, []);

  const activeMovie = useMemo(
    () => getMovieById(activeMovieId),
    [activeMovieId],
  );

  const relatedMovies = useMemo(() => {
    if (!activeMovie) return [];

    const relatedIds = activeMovie.related || [];
    return relatedIds
      .map((id) => getMovieById(id))
      .filter(Boolean)
      .slice(0, 3);
  }, [activeMovie]);

  const applySetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSelectMovie = (movieId) => {
    setActiveMovieId(movieId);
    setShowSearchHistory(false);
  };

  const clearSearchHistory = () => setRecentSearches([]);

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
              <AuthPanel
                user={user}
                onSignIn={async () => {
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
                }}
                onSignOut={async () => {
                  await auth.signOut();
                  setUser(null);
                }}
              />
            </div>
          </header>

          <MovieDetail
            movie={activeMovie}
            relatedMovies={relatedMovies}
            onBack={() => setActiveMovieId(null)}
            onMovieSelect={handleSelectMovie}
          />

          {showSettings && (
            <SettingsPanel
              settings={settings}
              onChange={applySetting}
              onClose={() => setShowSettings(false)}
            />
          )}
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
            <AuthPanel
              user={user}
              onSignIn={async () => {
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
              }}
              onSignOut={async () => {
                await auth.signOut();
                setUser(null);
              }}
            />
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
                <button type="button" key={movie.id} className="trending-item" onClick={() => handleSelectMovie(movie.id)}>
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
            <div className="movie-grid">
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onSelect={() => handleSelectMovie(movie.id)} />
              ))}
            </div>
          )}
        </section>
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
