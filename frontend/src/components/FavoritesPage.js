// components/FavoritesPage.js
import React, { useState, useEffect } from 'react';
import SongList from './Songlist';

const API_BASE_URL = 'http://localhost:5000/api';

export default function FavoritesPage({ user, onSongSelect, onError }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.user_id}/favorites`);
      if (!response.ok) throw new Error('Failed to fetch favorites');
      const data = await response.json();
      setFavorites(data);
    } catch (error) {
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Your Favorites ❤️</h1>
        <p>Songs you've loved</p>
      </div>

      {loading ? (
        <div className="loading">Loading favorites...</div>
      ) : (
        <SongList songs={favorites} user={user} onSongSelect={onSongSelect} />
      )}
    </div>
  );
}