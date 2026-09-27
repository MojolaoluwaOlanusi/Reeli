const formatRuntime = (minutes) => {
  if (!minutes) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const MovieDetail = ({ movie, relatedMovies, loading, error, onBack, onMovieSelect }) => {
  if (!movie) return null;

  const watchLinks = movie.whereToWatch || [];

  return (
    <section className="movie-detail">
      <button className="back-button" onClick={onBack} type="button">
        ← Back to discovery
      </button>
      {loading && <p role="status">Loading title details...</p>}
      {error && <p role="alert">{error}</p>}

      <div
        className="detail-hero"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.25), rgba(2,6,23,0.9)), url(${movie.backdrop})`,
        }}
      >
        <div className="detail-hero__content">
          <div className="detail-poster-wrap">
            <img src={movie.poster} alt={movie.title} className="detail-poster" />
          </div>

          <div className="detail-copy">
            <p className="eyebrow">{movie.contentType}</p>
            <h1>{movie.title}</h1>
            <p className="tagline">{movie.tagline}</p>

            <div className="meta-row">
              <span>{movie.genres?.join(' • ') || 'General'}</span>
              <span>{formatDate(movie.releaseDate)}</span>
              <span>{formatRuntime(movie.runtime)}</span>
            </div>

            <div className="badge-row">
              {movie.isAnime && <span className="badge badge--accent">Anime</span>}
              {movie.hasManga && <span className="badge">Has Manga</span>}
              {movie.hasManhwa && <span className="badge">Has Manhwa</span>}
              {movie.isSeries && <span className="badge">Series</span>}
              {movie.seriesStatus && <span className="badge">{movie.seriesStatus}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <div className="panel">
            <h2>Overview</h2>
            <p>{movie.summary}</p>
          </div>

          {movie.trailerUrl && <div className="video-panel panel">
            <h2>Trailer</h2>
            <div className="video-shell">
              <iframe
                src={movie.trailerUrl}
                title={movie.videoTitle || `${movie.title} trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>}

          <div className="panel">
            <h2>Where to watch</h2>
            <div className="watch-links">
              {watchLinks.length ? watchLinks.map((entry) => (
                <a key={`${movie.id}-${entry.name}`} href={entry.url} target="_blank" rel="noreferrer">
                  {entry.name}
                </a>
              )) : <span>Availability is not listed for this region.</span>}
            </div>
          </div>

          <div className="panel">
            <h2>People</h2>
            <div className="people-grid">
              <div>
                <h3>Actors</h3>
                <ul>
                  {(movie.actors || []).map((actor) => (
                    <li key={actor}>{actor}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Directors</h3>
                <ul>
                  {(movie.directors || []).map((director) => (
                    <li key={director}>{director}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Producers</h3>
                <ul>
                  {(movie.producers || []).map((producer) => (
                    <li key={producer}>{producer}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="detail-side">
          <div className="panel">
            <h2>Quick facts</h2>
            <ul className="facts-list">
              <li><strong>Release:</strong> {formatDate(movie.releaseDate)}</li>
              <li><strong>Runtime:</strong> {formatRuntime(movie.runtime)}</li>
              <li><strong>Type:</strong> {movie.contentType}</li>
              <li><strong>Series status:</strong> {movie.seriesStatus || 'Unknown'}</li>
              <li><strong>Anime:</strong> {movie.isAnime ? 'Yes' : 'Not identified'}</li>
              <li><strong>Manga:</strong> {movie.hasManga == null ? 'Unknown' : movie.hasManga ? 'Yes' : 'No'}</li>
              <li><strong>Manhwa:</strong> {movie.hasManhwa == null ? 'Unknown' : movie.hasManhwa ? 'Yes' : 'No'}</li>
              <li><strong>More entries:</strong> {movie.seriesStatus?.startsWith('Part of ') ? movie.seriesStatus.slice(8) : movie.isSeries ? 'Series' : 'Standalone'}</li>
            </ul>
          </div>

          <div className="panel">
            <h2>Related titles</h2>
            <div className="related-list">
              {relatedMovies.map((relatedMovie) => (
                <button
                  key={relatedMovie.id}
                  className="related-item"
                  type="button"
                  onClick={() => onMovieSelect(relatedMovie)}
                >
                  <img src={relatedMovie.poster} alt={relatedMovie.title} />
                  <div>
                    <strong>{relatedMovie.title}</strong>
                    <span>{relatedMovie.contentType}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default MovieDetail;
