// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import HomePage from './components/Homepage';
import LoginPage from './components/Loginpage';
import SignupPage from './components/SignupPage';
import RecommendationsPage from './components/Recommendations';
import UploadSongPage from './components/Uploadsong';
import MusicPlayer from './components/Musicplayer';
import Navigation from './components/Navigation';
import SearchPage from './components/SearchPage';
import FavoritesPage from './components/FavoritesPage';
import PlaylistsPage from './components/PlaylistsPage';
import HistoryPage from './components/HistoryPage';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function AppContent() {
  const [currentSong, setCurrentSong] = useState(null);
  const [error, setError] = useState('');
  const { user, logout, loading } = useAuth();

  const handleSongPlay = async (song) => {
    if (!song || !song.song_id) {
      console.error('Invalid song data:', song);
      return;
    }

    console.log('🎵 Playing song:', song.title);
    setCurrentSong(song);
    
    if (user && user.user_id) {
      try {
        await saveToHistory(song);
      } catch (error) {
        console.error('Failed to save song to history:', error);
      }
    }
  };

  const saveToHistory = async (song) => {
    if (!user || !user.user_id || !song || !song.song_id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.user_id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: song.song_id })
      });

      if (!response.ok) throw new Error('Failed to save history');
      console.log('✅ History saved');
    } catch (error) {
      console.error('❌ History save error:', error);
      throw error;
    }
  };

  const handleApiError = (error) => {
    console.error('API Error:', error);
    setError(error.message || 'An error occurred');
    setTimeout(() => setError(''), 5000);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>Loading Music Mood...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {error && (
        <div className="global-error">
          <div className="error-content">
            <span>{error}</span>
            <button onClick={() => setError('')}>×</button>
          </div>
        </div>
      )}

      {user && <Navigation user={user} onLogout={logout} />}
      
      <div className={user ? "main-content-with-nav" : "main-content"}>
        <Routes>
          <Route path="/" element={user ? <HomePage user={user} onSongSelect={handleSongPlay} onError={handleApiError} /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onError={handleApiError} />} />
          <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignupPage onError={handleApiError} />} />
          <Route path="/recommendations" element={user ? <RecommendationsPage user={user} onSongSelect={handleSongPlay} onError={handleApiError} /> : <Navigate to="/login" replace />} />
          <Route path="/upload" element={user ? <UploadSongPage user={user} onError={handleApiError} /> : <Navigate to="/login" replace />} />
          <Route path="/search" element={user ? <SearchPage user={user} onSongSelect={handleSongPlay} onError={handleApiError} /> : <Navigate to="/login" replace />} />
          <Route path="/favorites" element={user ? <FavoritesPage user={user} onSongSelect={handleSongPlay} onError={handleApiError} /> : <Navigate to="/login" replace />} />
          <Route path="/playlists" element={user ? <PlaylistsPage user={user} onSongSelect={handleSongPlay} onError={handleApiError} /> : <Navigate to="/login" replace />} />
          <Route path="/history" element={user ? <HistoryPage user={user} onSongSelect={handleSongPlay} onError={handleApiError} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
      </div>
      
      {user && currentSong && (
        <MusicPlayer 
          song={currentSong} 
          user={user}
          onNext={() => console.log('Next song')}
          onPrevious={() => console.log('Previous song')}
          onError={handleApiError}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;