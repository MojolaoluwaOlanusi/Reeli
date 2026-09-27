import React from 'react';

const Search = ({
  searchTerm,
  setSearchTerm,
  recentSearches = [],
  showSearchHistory = false,
  onSelectRecent,
  onClearHistory,
}) => {
  return (
    <div className="search-wrap">
      <div className="search">
        <div>
          <img src="/search.svg" alt="search" />
          <input
            type="text"
            placeholder="Search by movie, actor, director, tag, or genre"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>

      {showSearchHistory && recentSearches.length > 0 && (
        <div className="search-history">
          <div className="history-header">
            <span>Recent searches</span>
            <button type="button" onClick={onClearHistory}>Clear</button>
          </div>
          <ul>
            {recentSearches.map((item) => (
              <li key={item}>
                <button type="button" onClick={() => onSelectRecent(item)}>{item}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Search;
