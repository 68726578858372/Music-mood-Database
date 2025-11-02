// components/Recommendations.js
import React, { useState, useEffect } from 'react';
import SongList from './Songlist';

const API_BASE_URL = 'http://localhost:5000/api';

export default function RecommendationsPage({ user, onSongSelect, onError }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState('Sunny');

  useEffect(() => {
    fetchRecommendations();
  }, [user, weather]);

  const fetchRecommendations = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/recommend_songs/${user.user_id}?weather=${weather}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Recommendations 🎯</h1>
        <p>Songs tailored for your mood</p>
        
        <div className="weather-selector">
          <label>Select Weather Mood:</label>
          <select value={weather} onChange={(e) => setWeather(e.target.value)}>
            <option value="Sunny">☀️ Sunny</option>
            <option value="Rainy">🌧️ Rainy</option>
            <option value="Cloudy">☁️ Cloudy</option>
            <option value="Snow">❄️ Snow</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Finding perfect recommendations...</div>
      ) : (
        <SongList songs={recommendations} user={user} onSongSelect={onSongSelect} />
      )}
    </div>
  );
}