// components/SongCard.js
import React, { useState } from 'react';
import PlaylistModal from './PlaylistModal';

const API_BASE_URL = 'http://localhost:5000/api';

export default function SongCard({ song, user, onPlay, onError }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const isYouTubeUrl = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const handlePlay = () => {
    if (onPlay) onPlay(song);
  };

  const toggleFavorite = async () => {
    if (!user) return;

    try {
      if (isFavorite) {
        await fetch(`${API_BASE_URL}/users/${user.user_id}/favorites/${song.song_id}`, {
          method: 'DELETE'
        });
      } else {
        await fetch(`${API_BASE_URL}/users/${user.user_id}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ song_id: song.song_id })
        });
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      if (onError) onError(error);
    }
  };

  return (
    <div className="song-card">
      <div className="song-card-header">
        <div className="song-cover" onClick={handlePlay}>
          <span>{isYouTubeUrl(song.file_path) ? '📺' : '🎵'}</span>
          <div className="play-overlay">
            {isYouTubeUrl(song.file_path) ? '🌐' : '▶'}
          </div>
        </div>
        
        <div className="song-actions">
          <button 
            onClick={toggleFavorite} 
            className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
          <button 
            onClick={() => setShowPlaylistModal(true)}
            className="playlist-btn"
          >
            ➕
          </button>
        </div>
      </div>

      <div className="song-info">
        <h3 className="song-title" onClick={handlePlay}>{song.title}</h3>
        <p className="song-artist">{song.artist}</p>
        <div className="song-meta">
          <span className="mood-tag">{song.mood_tag}</span>
          {isYouTubeUrl(song.file_path) && (
            <span className="youtube-badge">YouTube</span>
          )}
        </div>
      </div>

      {showPlaylistModal && (
        <PlaylistModal 
          song={song}
          user={user}
          onClose={() => setShowPlaylistModal(false)}
          onError={onError}
        />
      )}
    </div>
  );
}