// components/Navigation.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navigation({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/recommendations', label: 'Recommendations', icon: '🎯' },
    { path: '/favorites', label: 'Favorites', icon: '❤️' },
    { path: '/playlists', label: 'Playlists', icon: '📁' },
    { path: '/history', label: 'History', icon: '🕒' },
    { path: '/upload', label: 'Upload', icon: '⬆️' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/" className="brand-link">
          🎵 MoodMusic
        </Link>
      </div>
      
      <div className="nav-links">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>

      <div className="nav-user">
        <span className="welcome-text">Welcome, {user?.username}</span>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}