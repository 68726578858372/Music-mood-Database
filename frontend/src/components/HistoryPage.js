// components/HistoryPage.js
import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function HistoryPage({ user, onSongSelect, onError }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [user, lastUpdate]);

  const fetchHistory = async () => {
    if (!user) {
      console.log('❌ No user provided to fetch history');
      setLoading(false);
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      console.log('🔄 Fetching history for user:', user.user_id || user.id);
      const userId = user.user_id || user.id;
      
      if (!userId) {
        throw new Error('No user ID found');
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/history`);
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response error:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📝 History data received:', data);
      
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error('❌ Unexpected data format:', data);
        throw new Error('Invalid data format received from server');
      }
      
    } catch (error) {
      console.error('❌ Error fetching history:', error);
      setError(error.message);
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown time';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (e) {
      return 'Invalid date';
    }
  };

  const handleRefresh = () => {
    setLastUpdate(Date.now());
  };

  const handleRetry = () => {
    setError(null);
    handleRefresh();
  };

  // Sort history by most recent first
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.played_at || 0) - new Date(a.played_at || 0)
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Listening History 🕒</h1>
        <p>Your recently played songs</p>
        <div className="header-actions">
          <button onClick={handleRefresh} className="refresh-btn" disabled={loading}>
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
          {sortedHistory.length > 0 && (
            <span className="history-count">{sortedHistory.length} songs</span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load history</h3>
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-btn">
            🔄 Try Again
          </button>
          <details className="error-details">
            <summary>Debug Information</summary>
            <div className="debug-info">
              <p><strong>User ID:</strong> {user?.user_id || user?.id || 'No user ID'}</p>
              <p><strong>API Endpoint:</strong> {API_BASE_URL}/users/{(user?.user_id || user?.id)}/history</p>
              <p><strong>Last Update:</strong> {new Date(lastUpdate).toLocaleString()}</p>
            </div>
          </details>
        </div>
      )}

      {!error && loading ? (
        <div className="loading">
          <div className="loading-spinner">⟳</div>
          Loading your listening history...
        </div>
      ) : !error && sortedHistory.length > 0 ? (
        <div className="history-list">
          {sortedHistory.map(entry => (
            <div key={entry.id} className="history-item">
              <div className="history-song" onClick={() => onSongSelect(entry.song)}>
                <div className="song-cover-small">
                  <span>🎵</span>
                </div>
                <div className="song-info">
                  <h4>{entry.song?.title || 'Unknown Song'}</h4>
                  <p>{entry.song?.artist || 'Unknown Artist'} • {entry.song?.mood_tag || 'No mood'}</p>
                  <div className="history-meta">
                    <span className="play-time">{formatDate(entry.played_at)}</span>
                  </div>
                </div>
              </div>
              <div className="history-actions">
                <button 
                  onClick={() => entry.song && onSongSelect(entry.song)}
                  className="play-again-btn"
                  disabled={!entry.song}
                >
                  ▶️ Play
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !error ? (
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <h3>No listening history yet</h3>
          <p>Start playing some songs to see them here!</p>
          <button onClick={handleRefresh} className="refresh-btn">
            🔄 Check Again
          </button>
        </div>
      ) : null}

      <style jsx>{`
        .page-container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .page-header {
          margin-bottom: 30px;
          text-align: center;
        }
        
        .page-header h1 {
          color: #1DB954;
          margin-bottom: 8px;
          font-size: 2rem;
        }
        
        .page-header p {
          color: #b3b3b3;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }
        
        .header-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-top: 10px;
        }
        
        .refresh-btn {
          background: #1DB954;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s;
        }
        
        .refresh-btn:hover:not(:disabled) {
          background: #1ed760;
        }
        
        .refresh-btn:disabled {
          background: #b3b3b3;
          cursor: not-allowed;
        }
        
        .history-count {
          color: #b3b3b3;
          font-size: 14px;
          background: #282828;
          padding: 8px 16px;
          border-radius: 20px;
        }
        
        .error-state {
          background: #2d1a1a;
          border: 1px solid #ff4444;
          border-radius: 10px;
          padding: 30px;
          text-align: center;
          margin-bottom: 20px;
        }
        
        .error-icon {
          font-size: 3rem;
          margin-bottom: 15px;
        }
        
        .error-state h3 {
          color: #ff4444;
          margin-bottom: 10px;
        }
        
        .error-state p {
          color: #ff9999;
          margin-bottom: 20px;
        }
        
        .retry-btn {
          background: #ff4444;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 15px;
        }
        
        .retry-btn:hover {
          background: #ff6666;
        }
        
        .error-details {
          text-align: left;
          margin-top: 15px;
        }
        
        .error-details summary {
          cursor: pointer;
          color: #b3b3b3;
          padding: 10px;
          background: #1a1a1a;
          border-radius: 5px;
        }
        
        .debug-info {
          background: #1a1a1a;
          padding: 15px;
          border-radius: 5px;
          margin-top: 10px;
          font-family: monospace;
          font-size: 12px;
        }
        
        .debug-info p {
          margin: 5px 0;
          color: #b3b3b3;
        }
        
        .loading {
          text-align: center;
          color: #b3b3b3;
          font-size: 16px;
          padding: 60px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }
        
        .loading-spinner {
          font-size: 2rem;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px;
          background: #181818;
          border-radius: 10px;
          transition: all 0.2s ease;
          border: 1px solid #282828;
        }
        
        .history-item:hover {
          background: #282828;
          transform: translateY(-2px);
        }
        
        .history-song {
          display: flex;
          align-items: center;
          gap: 18px;
          flex: 1;
          cursor: pointer;
          min-width: 0;
        }
        
        .song-cover-small {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #1DB954, #1ed760);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        
        .song-info {
          flex: 1;
          min-width: 0;
        }
        
        .song-info h4 {
          margin: 0 0 6px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .song-info p {
          margin: 0 0 8px 0;
          color: #b3b3b3;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .history-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .play-time {
          color: #1DB954;
          font-size: 12px;
          font-weight: 500;
        }
        
        .history-actions {
          flex-shrink: 0;
          margin-left: 15px;
        }
        
        .play-again-btn {
          background: rgba(29, 185, 84, 0.2);
          color: #1DB954;
          border: 1px solid #1DB954;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
        }
        
        .play-again-btn:hover:not(:disabled) {
          background: #1DB954;
          color: white;
        }
        
        .play-again-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: #b3b3b3;
          background: #181818;
          border-radius: 15px;
          border: 2px dashed #282828;
        }
        
        .empty-icon {
          font-size: 64px;
          margin-bottom: 20px;
          opacity: 0.7;
        }
        
        .empty-state h3 {
          color: white;
          margin-bottom: 12px;
          font-size: 1.5rem;
        }
        
        .empty-state p {
          margin-bottom: 25px;
          font-size: 1.1rem;
        }
      `}</style>
    </div>
  );
}