# models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Relationships
    listening_history = relationship("ListeningHistory", back_populates="user")
    saved_songs = relationship("SavedSong", back_populates="user")
    playlists = relationship("Playlist", back_populates="user")

class Song(Base):
    __tablename__ = 'songs'
    
    song_id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    artist = Column(String(255))
    file_path = Column(String(500))
    mood_tag = Column(String(50))
    uploaded_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    listening_history = relationship("ListeningHistory", back_populates="song")
    saved_by_users = relationship("SavedSong", back_populates="song")
    playlist_songs = relationship("PlaylistSong", back_populates="song")

class ListeningHistory(Base):
    __tablename__ = 'listening_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    song_id = Column(Integer, ForeignKey('songs.song_id'))
    played_at = Column(TIMESTAMP, default=datetime.now)
    
    user = relationship("User", back_populates="listening_history")
    song = relationship("Song", back_populates="listening_history")

class Playlist(Base):
    __tablename__ = 'playlists'
    
    playlist_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    playlist_name = Column(String(100), nullable=False)
    
    user = relationship("User", back_populates="playlists")
    songs = relationship("PlaylistSong", back_populates="playlist")

class PlaylistSong(Base):
    __tablename__ = 'playlist_songs'
    
    playlist_song_id = Column(Integer, primary_key=True)
    playlist_id = Column(Integer, ForeignKey('playlists.playlist_id'))
    song_id = Column(Integer, ForeignKey('songs.song_id'))
    
    playlist = relationship("Playlist", back_populates="songs")
    song = relationship("Song", back_populates="playlist_songs")

class SavedSong(Base):
    __tablename__ = 'saved_songs'
    
    saved_song_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'))
    song_id = Column(Integer, ForeignKey('songs.song_id'))
    
    user = relationship("User", back_populates="saved_songs")
    song = relationship("Song", back_populates="saved_by_users")