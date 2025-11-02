// components/Uploadsong.js
import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function UploadSongPage({ user, onError }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/upload-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: youtubeUrl,
          user_id: user.user_id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Song uploaded successfully! Mood detected: ' + data.song.mood_tag);
        setYoutubeUrl('');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      const errorMsg = error.message || 'Upload failed. Please try again.';
      setMessage('❌ ' + errorMsg);
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upload Song ⬆️</h1>
        <p>Add songs from YouTube URLs</p>
      </div>

      <div className="upload-form-container">
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label>YouTube URL</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
          </div>

          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} className="upload-btn">
            {loading ? 'Processing...' : 'Upload & Detect Mood'}
          </button>
        </form>

        <div className="upload-info">
          <h3>How it works:</h3>
          <ul>
            <li>Paste a YouTube music URL</li>
            <li>We'll analyze the audio and detect the mood</li>
            <li>The song will be added to the database</li>
            <li>Available for all users to discover</li>
          </ul>
        </div>
      </div>
    </div>
  );
}