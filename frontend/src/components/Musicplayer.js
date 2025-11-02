import React, { useState, useEffect, useRef } from "react";

export default function MusicPlayer({ song, user }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [player, setPlayer] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  
  // History saving refs
  const lastSaveRef = useRef(0);
  const hasSavedStartRef = useRef(false);
  const hasSavedEndRef = useRef(false);
  const savedMilestonesRef = useRef(new Set());

  // Extract YouTube ID from URL
  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  // Improved auto-save listening history with better duplicate prevention
  const saveListeningHistory = async (playDuration = 0, saveType = 'milestone') => {
    if (!song || !user) return;

    // Try multiple possible property names for IDs
    const userId = user.user_id || user.id || user.userId;
    const songId = song.song_id || song.id || song.songId;

    if (!userId || !songId) return;

    // Prevent too frequent saves (minimum 30 seconds between saves)
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveRef.current;
    
    if (timeSinceLastSave < 30000 && saveType !== 'end') {
      console.log('⏰ Skipping save - too soon since last save');
      return;
    }

    // Prevent duplicate milestone saves
    const milestoneKey = Math.floor(playDuration / 30) * 30; // Round to nearest 30s
    if (saveType === 'milestone' && savedMilestonesRef.current.has(milestoneKey)) {
      console.log('⏰ Skipping save - milestone already saved');
      return;
    }

    // Prevent duplicate start/end saves
    if (saveType === 'start' && hasSavedStartRef.current) {
      console.log('⏰ Skipping save - start already saved');
      return;
    }
    if (saveType === 'end' && hasSavedEndRef.current) {
      console.log('⏰ Skipping save - end already saved');
      return;
    }

    try {
      const historyData = {
        user_id: userId,
        song_id: songId,
        play_duration: Math.round(playDuration),
        completed: saveType === 'end'
      };

      console.log(`📝 Saving ${saveType} history:`, historyData);

      const response = await fetch('/api/listening-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${saveType} history saved:`, result);
        
        // Update tracking refs
        lastSaveRef.current = now;
        
        if (saveType === 'start') hasSavedStartRef.current = true;
        if (saveType === 'end') hasSavedEndRef.current = true;
        if (saveType === 'milestone') savedMilestonesRef.current.add(milestoneKey);
        
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save listening history:', errorData);
      }
    } catch (error) {
      console.error('Network error saving listening history:', error);
    }
  };

  // Reset history tracking when song changes
  useEffect(() => {
    if (song) {
      console.log("🎵 Loading:", song.title);
      setCurrentTime(0);
      setDuration(0);
      
      // Reset all tracking refs
      lastSaveRef.current = 0;
      hasSavedStartRef.current = false;
      hasSavedEndRef.current = false;
      savedMilestonesRef.current = new Set();
      
      loadYouTubePlayer();
    }

    return () => {
      // Cleanup interval on unmount
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [song]);

  // Save history when song starts - ONLY ONCE
  useEffect(() => {
    if (song && user && !hasSavedStartRef.current) {
      const timer = setTimeout(() => {
        saveListeningHistory(0, 'start');
      }, 2000); // Wait 2 seconds to ensure player is loaded
      
      return () => clearTimeout(timer);
    }
  }, [song, user]);

  const loadYouTubePlayer = () => {
    const videoId = extractYouTubeId(song?.file_path);
    if (!videoId) return;

    // Remove existing player
    if (playerRef.current) {
      playerRef.current.innerHTML = '';
    }

    // Create YouTube iframe
    const iframe = document.createElement('iframe');
    iframe.width = "0";
    iframe.height = "0";
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&playsinline=1`;
    iframe.frameBorder = "0";
    iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    
    if (playerRef.current) {
      playerRef.current.appendChild(iframe);
    }

    // Wait for iframe to load
    iframe.onload = () => {
      console.log("✅ YouTube player ready");
      setPlayer(iframe);
      
      // Start polling for progress updates
      startProgressPolling(iframe);
    };
  };

  const startProgressPolling = (iframe) => {
    // Clear existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Poll for player state every 3 seconds (less frequent)
    progressIntervalRef.current = setInterval(() => {
      if (iframe.contentWindow) {
        // Get current time
        iframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
        
        // Get duration
        iframe.contentWindow.postMessage('{"event":"command","func":"getDuration","args":""}', '*');
      }
    }, 3000);

    // Listen for messages from YouTube player
    const handleMessage = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.info && Array.isArray(data.info)) {
          if (data.info[0] === 'getCurrentTime') {
            const newTime = data.info[1] || 0;
            setCurrentTime(newTime);
            
            // Auto-save history at specific milestones only
            if (user && isPlaying && newTime > 0) {
              const saveMilestones = [60, 120, 180, 240, 300]; // Save only at these seconds
              if (saveMilestones.includes(Math.floor(newTime))) {
                saveListeningHistory(newTime, 'milestone');
              }
            }
          } else if (data.info[0] === 'getDuration') {
            setDuration(data.info[1] || 0);
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  };

  const handlePlayPause = () => {
    if (!player) return;

    if (!isPlaying) {
      // Play video
      player.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
      setIsPlaying(true);
    } else {
      // Pause video
      player.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (player) {
      player.contentWindow.postMessage(`{"event":"command","func":"setVolume","args":[${newVolume * 100}]}`, '*');
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    setIsSeeking(true);
    
    if (player) {
      player.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${newTime}, true]}`, '*');
    }
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
  };

  // Save history when song ends (reaches near the end) - ONLY ONCE
  useEffect(() => {
    if (duration > 0 && currentTime > 0 && currentTime >= duration * 0.9 && !hasSavedEndRef.current) {
      saveListeningHistory(currentTime, 'end');
    }
  }, [currentTime, duration]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!song) return null;

  return (
    <div style={{
      position: "fixed", 
      bottom: 0, 
      left: 0, 
      right: 0,
      background: "linear-gradient(135deg, #181818, #000000)",
      padding: "8px 20px 12px 20px",
      boxShadow: "0 -4px 30px rgba(0,0,0,0.5)", 
      zIndex: 1000, 
      color: "white",
      borderTop: "1px solid #282828",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      
      {/* Progress Bar - Top */}
      <div style={{ 
        position: "relative",
        height: "4px",
        background: "#5e5e5e",
        borderRadius: "2px",
        marginBottom: "15px",
        cursor: "pointer"
      }}>
        <div 
          style={{
            height: "100%",
            background: "#1DB954",
            width: `${progressPercentage}%`,
            transition: isSeeking ? "none" : "width 0.1s ease",
            borderRadius: "2px"
          }}
        />
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          onTouchStart={handleSeekStart}
          onTouchEnd={handleSeekEnd}
          style={{
            position: "absolute",
            top: "-6px",
            left: 0,
            width: "100%",
            height: "16px",
            opacity: 0,
            cursor: "pointer"
          }}
        />
      </div>

      {/* Main Player Content */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        gap: "15px"
      }}>
        
        {/* Song Info - Left */}
        <div style={{ 
          flex: "0 1 300px", 
          display: "flex", 
          alignItems: "center", 
          gap: "12px",
          minWidth: 0
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            background: "linear-gradient(135deg, #1DB954, #1ed760)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px"
          }}>
            🎵
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ 
              fontSize: "14px", 
              fontWeight: "600",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "2px"
            }}>
              {song.title}
            </div>
            <div style={{ 
              fontSize: "11px", 
              color: "#b3b3b3",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "4px"
            }}>
              {song.artist}
            </div>
            <div style={{ 
              fontSize: "10px", 
              color: "#1DB954"
            }}>
              {song.mood_tag} • {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Controls - Center */}
        <div style={{ 
          flex: "0 0 auto", 
          display: "flex", 
          alignItems: "center", 
          gap: "16px" 
        }}>
          <button
            onClick={() => {
              if (player) {
                const newTime = Math.max(0, currentTime - 10);
                player.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${newTime}, true]}`, '*');
                setCurrentTime(newTime);
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "#b3b3b3",
              fontSize: "20px",
              cursor: "pointer",
              padding: "8px",
              opacity: player ? 1 : 0.5
            }}
            disabled={!player}
          >
            ⏪
          </button>

          <button
            onClick={handlePlayPause}
            disabled={!player}
            style={{
              background: "white",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              cursor: player ? "pointer" : "not-allowed",
              color: "black",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              opacity: player ? 1 : 0.5
            }}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </button>

          <button
            onClick={() => {
              if (player) {
                const newTime = Math.min(duration, currentTime + 10);
                player.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${newTime}, true]}`, '*');
                setCurrentTime(newTime);
              }
            }}
            style={{
              background: "none",
              border: "none",
              color: "#b3b3b3",
              fontSize: "20px",
              cursor: "pointer",
              padding: "8px",
              opacity: player ? 1 : 0.5
            }}
            disabled={!player}
          >
            ⏩
          </button>
        </div>

        {/* Volume & Extra - Right */}
        <div style={{ 
          flex: "0 1 200px", 
          display: "flex", 
          alignItems: "center", 
          gap: "12px",
          justifyContent: "flex-end"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            color: "#b3b3b3"
          }}>
            <span style={{ fontSize: "16px" }}>
              {volume === 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊"}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              style={{ 
                width: "80px", 
                height: "4px",
                background: "#5e5e5e",
                borderRadius: "2px",
                opacity: player ? 1 : 0.5
              }}
              disabled={!player}
            />
          </div>
        </div>
      </div>

      {/* Hidden YouTube Player Container */}
      <div 
        ref={playerRef}
        style={{ 
          position: 'absolute', 
          top: -1000, 
          left: -1000,
          width: '0px', 
          height: '0px',
          overflow: 'hidden'
        }}
      />

      {/* Status Bar */}
      <div style={{
        marginTop: "10px",
        padding: "6px 8px",
        background: "rgba(0,0,0,0.3)",
        borderRadius: "4px",
        fontSize: "10px",
        fontFamily: "monospace",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <strong>Now Playing:</strong> {song.title}
        </div>
        <div>
          <strong>Progress:</strong> {formatTime(currentTime)} / {formatTime(duration)} 
          ({Math.round(progressPercentage)}%)
        </div>
        <div>
          <strong>Status:</strong> {isPlaying ? "▶️ Playing" : "⏸️ Paused"}
          {user && " • 💾 Auto-saving"}
        </div>
      </div>
    </div>
  );
}