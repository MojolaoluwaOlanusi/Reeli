import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getTitleTrailer } from '../tmdb.js';

const MovieCard = ({ movie, onSelect, variant = 'grid' }) => {
  const { title, poster, releaseDate, genres = [], voteAverage } = movie;
  const cardRef = useRef(null);
  const previewRef = useRef(null);
  const timerRef = useRef(null);
  const requestRef = useRef(null);
  const pointerOrigin = useRef(null);
  const longPressTriggered = useRef(false);
  const [preview, setPreview] = useState(null);
  const previewOpen = Boolean(preview);

  const stopPreviewTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const closePreview = () => {
    stopPreviewTimer();
    requestRef.current?.abort();
    requestRef.current = null;
    setPreview(null);
  };
  const closePreviewRef = useRef(closePreview);
  closePreviewRef.current = closePreview;

  // FIX: normalize tv -> series, and id fallback
  const getApiMovie = () => {
    const rawType = String(movie.mediaType || movie.media_type || movie.type || '').toLowerCase();
    const normalizedType = ['tv', 'series', 'show'].includes(rawType)? 'series' : 'movie';
    // handle both tv (first_air_date) and movie cases
    const finalType = movie.first_air_date || movie.firstAirDate? 'series' : normalizedType;
    return {
     ...movie,
      mediaType: finalType,
      tmdbId: movie.tmdbId || movie.id,
    };
  };

  const openPreview = async () => {
    const card = cardRef.current;
    if (!card) return;
    longPressTriggered.current = true;
    const rect = card.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const height = 228;
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    const top = rect.bottom + height + 12 < window.innerHeight
     ? rect.bottom + 10
      : Math.max(12, rect.top - height - 10);
    setPreview({ position: { top, left, width }, loading: true, trailer: null, error: '' });

    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const apiMovie = getApiMovie();
      const trailer = await getTitleTrailer(apiMovie, controller.signal);
      if (!controller.signal.aborted) {
        setPreview({
          position: { top, left, width },
          loading: false,
          trailer,
          error: trailer? '' : 'No trailer available.'
        });
      }
    } catch (error) {
      if (error.name!== 'AbortError') {
        setPreview({
          position: { top, left, width },
          loading: false,
          trailer: null,
          error: error.message
        });
      }
    }
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button!== 0) return;
    longPressTriggered.current = false;
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    stopPreviewTimer();
    timerRef.current = window.setTimeout(openPreview, 550);
  };

  const handlePointerMove = (event) => {
    if (!pointerOrigin.current) return;
    const distance = Math.hypot(event.clientX - pointerOrigin.current.x, event.clientY - pointerOrigin.current.y);
    if (distance > 9) {
      pointerOrigin.current = null;
      stopPreviewTimer();
    }
  };

  const handlePointerEnd = () => {
    pointerOrigin.current = null;
    stopPreviewTimer();
  };

  useEffect(() => {
    if (!previewOpen) return undefined;
    const dismissOutside = (event) => {
      if (cardRef.current?.contains(event.target) || previewRef.current?.contains(event.target)) return;
      closePreviewRef.current();
    };
    const dismiss = () => closePreviewRef.current();
    const dismissOnEscape = (event) => {
      if (event.key === 'Escape') closePreviewRef.current();
    };
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('keydown', dismissOnEscape);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('keydown', dismissOnEscape);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [previewOpen]);

  useEffect(() => () => {
    stopPreviewTimer();
    requestRef.current?.abort();
  }, []);

  const handleClick = (event) => {
    if (longPressTriggered.current) {
      event.preventDefault();
      longPressTriggered.current = false;
      return;
    }
    closePreview();
    onSelect();
  };

  return (
    <>
      <button
        ref={cardRef}
        type="button"
        className={`movie-card movie-card--${variant}`}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={(event) => event.preventDefault()}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) closePreview();
        }}
        style={{ touchAction: 'pan-y' }}
      >
        {poster? <img src={poster} alt={title} loading="lazy" /> : <span className="poster-missing">Reeli</span>}
        <div className="movie-card__body">
          <div className="movie-card__header">
            <h3>{title}</h3>
          </div>
          <div className="content">
            <span className="muted">{releaseDate? new Date(releaseDate).getFullYear() : 'N/A'}</span>
            {genres[0] && <><span>·</span><span className="lang">{genres[0]}</span></>}
            {voteAverage > 0 && <span className="card-rating">★ {voteAverage.toFixed(1)}</span>}
          </div>
        </div>
      </button>
      {preview && createPortal(
        <aside className="trailer-preview" ref={previewRef} style={preview.position} aria-label={`${title} trailer preview`}>
          <div className="trailer-preview__heading">
            <strong>{title}</strong>
            <button type="button" className="trailer-preview__close" onClick={closePreview} aria-label="Close trailer preview"><X size={17} /></button>
          </div>
          {preview.loading && <div className="trailer-preview__status">Loading trailer…</div>}
          {preview.error && <div className="trailer-preview__status">{preview.error}</div>}
          {preview.trailer && <iframe
            src={`${preview.trailer.trailerUrl}?autoplay=1&mute=1&controls=0&playsinline=1`}
            title={preview.trailer.videoTitle || `${title} trailer`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />}
        </aside>,
        document.body,
      )}
    </>
  );
};

export default MovieCard;