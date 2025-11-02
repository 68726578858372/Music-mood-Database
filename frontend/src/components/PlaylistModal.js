// components/PlaylistModal.js
import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function PlaylistModal({ mode = "create", song = null, user, onSubmit, onClose, onError }) {
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!playlistName.trim()) {
      if (onError) onError(new Error('Playlist name is required'));
      return;
    }

    setLoading(true);

    try {
      if (mode === 'create') {
        // Create new playlist
        const response = await fetch(`${API_BASE_URL}/users/${user.user_id}/playlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlist_name: playlistName.trim() })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create playlist');
        }

        console.log('Playlist created:', data);
        
        // If there's a song to add, add it to the new playlist
        if (song && data.playlist) {
          await addSongToPlaylist(data.playlist.playlist_id, song.song_id);
        }
        
        if (onSubmit) onSubmit(data.playlist);
        setPlaylistName('');
        onClose();
      }
    } catch (error) {
      console.error('Playlist creation error:', error);
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  const addSongToPlaylist = async (playlistId, songId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: songId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add song to playlist');
      }
      
      console.log('Song added to playlist');
    } catch (error) {
      console.error('Add to playlist error:', error);
      throw error;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{mode === 'create' ? 'Create Playlist' : 'Add to Playlist'}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Playlist Name</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="Enter playlist name"
              required
              disabled={loading}
            />
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading || !playlistName.trim()}
            >
              {loading ? 'Creating...' : (mode === 'create' ? 'Create' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}