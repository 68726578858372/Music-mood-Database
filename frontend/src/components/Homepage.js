// components/Homepage.js
import React, { useState, useEffect } from 'react';
import SongList from './Songlist';

const API_BASE_URL = 'http://localhost:5000/api';

export default function HomePage({ user, onSongSelect, onError }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/songs`);
      if (!response.ok) throw new Error('Failed to fetch songs');
      const data = await response.json();
      setSongs(data);
    } catch (error) {
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Welcome back, {user?.username}! 🎵</h1>
        <p>Discover your mood through music</p>
      </div>
      
      <div className="content-section">
        <h2>Latest Songs</h2>
        {loading ? (
          <div className="loading">Loading songs...</div>
        ) : (
          <SongList songs={songs} onSongSelect={onSongSelect} user={user} />
        )}
      </div>
    </div>
  );
}