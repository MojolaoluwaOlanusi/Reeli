import React from 'react';

const MovieCard = ({ movie, onSelect }) => {
  const { title, poster, releaseDate, contentType, genres = [] } = movie;

  return (
    <button type="button" className="movie-card" onClick={onSelect}>
      <img src={poster} alt={title} />

      <div className="movie-card__body">
        <div className="movie-card__header">
          <h3>{title}</h3>
          <span className="type-pill">{contentType}</span>
        </div>

        <div className="content">
          <span className="muted">{releaseDate ? new Date(releaseDate).getFullYear() : 'N/A'}</span>
          <span>•</span>
          <span className="lang">{genres[0] || 'General'}</span>
        </div>
      </div>
    </button>
  );
};

export default MovieCard;
