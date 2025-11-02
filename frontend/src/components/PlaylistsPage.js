// components/PlaylistsPage.js
import React, { useState, useEffect } from 'react';
import PlaylistModal from './PlaylistModal'; // Changed from './Playlistmodal'

const API_BASE_URL = 'http://localhost:5000/api';

export default function PlaylistsPage({ user, onSongSelect, onError }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  const fetchPlaylists = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.user_id}/playlists`);
      if (!response.ok) throw new Error('Failed to fetch playlists');
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async (name) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.user_id}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist_name: name })
      });

      if (!response.ok) throw new Error('Failed to create playlist');
      
      fetchPlaylists();
      setShowCreateModal(false);
    } catch (error) {
      if (onError) onError(error);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Your Playlists 📁</h1>
        <p>Manage your music collections</p>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="create-playlist-btn"
        >
          + Create Playlist
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading playlists...</div>
      ) : playlists.length > 0 ? (
        <div className="playlists-grid">
          {playlists.map(playlist => (
            <div key={playlist.playlist_id} className="playlist-card">
              <div className="playlist-cover">
                <span>📁</span>
                <div className="song-count">{playlist.song_count} songs</div>
              </div>
              <div className="playlist-info">
                <h3>{playlist.playlist_name}</h3>
                <p>Created {new Date(playlist.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No playlists yet</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="create-playlist-btn"
          >
            Create your first playlist
          </button>
        </div>
      )}

      {showCreateModal && (
        <PlaylistModal
          mode="create"
          onSubmit={createPlaylist}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}