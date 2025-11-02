// components/Songlist.js
import React from 'react';
import SongCard from './SongCard'; // Changed from './Songcard'

export default function SongList({ songs, user, onSongSelect, onError }) {
  if (!songs || songs.length === 0) {
    return (
      <div className="empty-state">
        <p>No songs found</p>
      </div>
    );
  }

  return (
    <div className="song-grid">
      {songs.map(song => (
        <SongCard
          key={song.song_id}
          song={song}
          user={user}
          onPlay={onSongSelect}
          onError={onError}
        />
      ))}
    </div>
  );
}