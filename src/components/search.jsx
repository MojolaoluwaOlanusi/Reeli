import { useState, useRef } from 'react';
import { Search as SearchIcon } from 'lucide-react';

const Search = ({
  searchTerm,
  setSearchTerm,
  recentSearches = [],
  onFocus,
  onSelectRecent,
  onClearHistory,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const searchHistoryRef = useRef(null);
  const showHistory = isFocused && !searchTerm?.trim() && recentSearches.length > 0;

  const handleBlur = (event) => {
    // Check if the blur is caused by clicking inside the search history dropdown
    if (searchHistoryRef.current && searchHistoryRef.current.contains(event.relatedTarget)) {
      return;
    }
    setIsFocused(false);
  };

  return (
    <div className="search-wrap">
      <div className="search">
        <div>
          <SearchIcon className="search-icon" size={18} strokeWidth={2} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search movies, people, genres..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={handleBlur}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsFocused(false);
                event.currentTarget.blur();
              }
            }}
          />
        </div>
      </div>

      {showHistory && (
        <div className="search-history" ref={searchHistoryRef}>
          <div className="history-header">
            <span>Recent searches</span>
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClearHistory}>Clear</button>
          </div>
          <ul>
            {recentSearches.map((item) => (
              <li key={item}>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
                  onSelectRecent(item);
                  setIsFocused(false);
                }}>{item}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Search;
