// components/SearchPage.js
import React, { useState } from 'react';
import SongList from './Songlist';

const API_BASE_URL = 'http://localhost:5000/api';

export default function SearchPage({ user, onSongSelect, onError }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Search Songs</h1>
        <p>Find songs by title, artist, or mood</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for songs, artists, or moods..."
            className="search-input"
          />
          <button type="submit" disabled={loading} className="search-btn">
            {loading ? 'Searching...' : '🔍'}
          </button>
        </div>
      </form>

      <div className="search-results">
        {loading ? (
          <div className="loading">Searching...</div>
        ) : results.length > 0 ? (
          <>
            <h3>Search Results ({results.length})</h3>
            <SongList songs={results} user={user} onSongSelect={onSongSelect} />
          </>
        ) : query ? (
          <div className="empty-state">No results found for "{query}"</div>
        ) : null}
      </div>
    </div>
  );
}