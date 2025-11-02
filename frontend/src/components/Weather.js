import React, { useEffect, useState } from "react";

export default function Recommendations({ userId, setCurrentSong, weather }) {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    fetch(`http://127.0.0.1:5000/api/recommend_songs/${userId}?weather=${weather}`)
      .then(res => res.json())
      .then(data => setSongs(data));
  }, [userId, weather]);

  const playSong = (song_id) => {
    fetch(`http://127.0.0.1:5000/api/play_song/${song_id}/${userId}`)
      .then(res => res.json())
      .then(data => setCurrentSong(data));
  };

  return (
    <div>
      <h3>Recommended for you ({weather})</h3>
      <ul>
        {songs.map(s => (
          <li key={s.song_id}>
            {s.title} - {s.artist} | Mood: {s.mood_tag || "Unknown"}
            <button onClick={() => playSong(s.song_id)}>Play</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
