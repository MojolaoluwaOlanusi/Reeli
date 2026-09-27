import React from 'react';

const MovieCard = ({ movie, onSelect, variant = 'grid' }) => {
  const { title, poster, releaseDate, genres = [], voteAverage } = movie;

  return (
    <button type="button" className={`movie-card movie-card--${variant}`} onClick={onSelect}>
      {poster ? <img src={poster} alt={title} loading="lazy" /> : <span className="poster-missing">Reeli</span>}

      <div className="movie-card__body">
        <div className="movie-card__header">
          <h3>{title}</h3>
        </div>

        <div className="content">
          <span className="muted">{releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}</span>
          {genres[0] && <><span>·</span><span className="lang">{genres[0]}</span></>}
          {voteAverage > 0 && <span className="card-rating">★ {voteAverage.toFixed(1)}</span>}
        </div>
      </div>
    </button>
  );
};

export default MovieCard;
