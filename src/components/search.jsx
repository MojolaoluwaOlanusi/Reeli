import { useState } from 'react';
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
  const showHistory = isFocused && !searchTerm?.trim() && recentSearches.length > 0;

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
            onBlur={() => setIsFocused(false)}
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
        <div className="search-history">
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
