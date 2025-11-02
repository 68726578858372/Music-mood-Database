from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import create_engine, or_
from sqlalchemy.orm import sessionmaker
from models import Base, User, Song, Playlist, PlaylistSong, ListeningHistory, SavedSong
from mood_models import MoodDetector
from datetime import datetime
import random
import hashlib
import secrets

app = Flask(__name__)
CORS(app)

# ----------------- DATABASE SETUP -----------------
engine = create_engine('mysql+mysqlconnector://musicuser:musicpass@localhost/music_mood_db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

def get_session():
    return Session()

# ----------------- MOOD DETECTOR SETUP -----------------
mood_detector = MoodDetector('AIzaSyBapJoEbKSsscFcCzdkmXdxS2i1K1f-_Ro')

# ----------------- AUTH ENDPOINTS -----------------
@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    if not all([username, email, password]):
        return jsonify({"error": "All fields are required"}), 400
    
    session = get_session()
    try:
        existing = session.query(User).filter((User.username==username)|(User.email==email)).first()
        if existing:
            return jsonify({"error": "Username or email already exists"}), 400
        
        user = User(username=username, email=email, password_hash=password)
        session.add(user)
        session.commit()
        
        return jsonify({
            "message": "User created successfully", 
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email
        }), 201
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    print(f"🔐 LOGIN ATTEMPT:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    
    if not all([username, password]):
        print("❌ Missing username or password")
        return jsonify({"error": "Username and password required"}), 400
    
    session = get_session()
    try:
        # Debug: List all users in database
        all_users = session.query(User).all()
        print(f"📊 USERS IN DATABASE: {len(all_users)}")
        for user in all_users:
            print(f"   👤 ID: {user.user_id}, Username: '{user.username}', Password: '{user.password_hash}'")
        
        # Try to find the user
        user = session.query(User).filter_by(username=username, password_hash=password).first()
        
        if user:
            print(f"✅ LOGIN SUCCESSFUL for user: {username}")
            return jsonify({
                "message": "Login success", 
                "user_id": user.user_id, 
                "username": user.username,
                "email": user.email
            })
        else:
            print(f"❌ LOGIN FAILED - No matching user found")
            # Check if username exists but password is wrong
            username_match = session.query(User).filter_by(username=username).first()
            if username_match:
                print(f"   ⚠️  Username exists but password doesn't match")
                print(f"   Stored password: '{username_match.password_hash}'")
                print(f"   Provided password: '{password}'")
            else:
                print(f"   ⚠️  Username '{username}' not found in database")
                
            return jsonify({"error": "Invalid credentials"}), 401
            
    except Exception as e:
        print(f"💥 LOGIN ERROR: {str(e)}")
        return jsonify({"error": "Server error"}), 500
    finally:
        session.close()

# ----------------- SONG ENDPOINTS -----------------
@app.route("/api/songs")
def get_songs():
    page = int(request.args.get("page", 0))
    size = int(request.args.get("size", 50))
    
    session = get_session()
    try:
        songs = session.query(Song).order_by(Song.song_id.desc()).offset(page*size).limit(size).all()
        
        return jsonify([{
            "song_id": s.song_id,
            "title": s.title,
            "artist": s.artist,
            "file_path": s.file_path,
            "mood_tag": s.mood_tag
        } for s in songs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/songs/<int:song_id>")
def get_song(song_id):
    session = get_session()
    try:
        song = session.query(Song).filter_by(song_id=song_id).first()
        if not song:
            return jsonify({"error": "Song not found"}), 404
        
        return jsonify({
            "song_id": song.song_id,
            "title": song.title,
            "artist": song.artist,
            "file_path": song.file_path,
            "mood_tag": song.mood_tag
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/upload-song", methods=["POST"])
def upload_song():
    data = request.json
    youtube_url = data.get('youtube_url')
    user_id = data.get('user_id')
    
    if not youtube_url:
        return jsonify({'error': 'YouTube URL is required'}), 400
    
    session = get_session()
    try:
        print(f"🎵 Processing YouTube URL: {youtube_url}")
        result = mood_detector.process_youtube_url(youtube_url)
        
        if 'error' in result:
            print(f"❌ Mood detection error: {result['error']}")
            return jsonify({'error': result['error']}), 400
        
        print(f"✅ Mood detected: {result['mood']}")
        
        # Check if song already exists
        existing_song = session.query(Song).filter_by(file_path=youtube_url).first()
        if existing_song:
            return jsonify({'error': 'This song is already in the database'}), 400
        
        # Create song - Using ONLY fields that exist in your model
        new_song = Song(
            title=result['title'],
            artist=result['artist'],
            file_path=youtube_url,
            mood_tag=result['mood'],
            uploaded_at=datetime.now()  # This field exists in your model
            # Removed uploaded_by since it doesn't exist in your model
        )
        
        session.add(new_song)
        session.commit()
        
        print(f"✅ Song uploaded successfully: {result['title']}")
        
        return jsonify({
            'message': 'Song uploaded successfully',
            'song': {
                'song_id': new_song.song_id,
                'title': new_song.title,
                'artist': new_song.artist,
                'file_path': new_song.file_path,
                'mood_tag': new_song.mood_tag
            }
        }), 201
        
    except Exception as e:
        session.rollback()
        print(f"❌ Upload error: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    finally:
        session.close()

# ----------------- SEARCH ENDPOINTS -----------------
@app.route("/api/search")
def search_songs():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "Search query is required"}), 400
    
    session = get_session()
    try:
        songs = session.query(Song).filter(
            or_(
                Song.title.ilike(f"%{query}%"),
                Song.artist.ilike(f"%{query}%"),
                Song.mood_tag.ilike(f"%{query}%")
            )
        ).limit(50).all()
        
        return jsonify([{
            "song_id": s.song_id,
            "title": s.title,
            "artist": s.artist,
            "file_path": s.file_path,
            "mood_tag": s.mood_tag
        } for s in songs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# ----------------- FAVORITES ENDPOINTS -----------------
@app.route("/api/users/<int:user_id>/favorites")
def get_user_favorites(user_id):
    session = get_session()
    try:
        favorites = session.query(Song).join(
            SavedSong, Song.song_id == SavedSong.song_id
        ).filter(SavedSong.user_id == user_id).all()
        
        return jsonify([{
            "song_id": s.song_id,
            "title": s.title,
            "artist": s.artist,
            "file_path": s.file_path,
            "mood_tag": s.mood_tag
        } for s in favorites])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/users/<int:user_id>/favorites", methods=["POST"])
def add_to_favorites(user_id):
    data = request.json
    song_id = data.get('song_id')
    
    if not song_id:
        return jsonify({"error": "Song ID is required"}), 400
    
    session = get_session()
    try:
        existing = session.query(SavedSong).filter_by(user_id=user_id, song_id=song_id).first()
        if existing:
            return jsonify({"error": "Song already in favorites"}), 400
        
        favorite = SavedSong(user_id=user_id, song_id=song_id)
        session.add(favorite)
        session.commit()
        
        return jsonify({"message": "Song added to favorites"}), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/users/<int:user_id>/favorites/<int:song_id>", methods=["DELETE"])
def remove_from_favorites(user_id, song_id):
    session = get_session()
    try:
        favorite = session.query(SavedSong).filter_by(user_id=user_id, song_id=song_id).first()
        if not favorite:
            return jsonify({"error": "Song not in favorites"}), 404
        
        session.delete(favorite)
        session.commit()
        
        return jsonify({"message": "Song removed from favorites"})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# ----------------- PLAYLIST ENDPOINTS -----------------
@app.route("/api/users/<int:user_id>/playlists")
def get_user_playlists(user_id):
    session = get_session()
    try:
        playlists = session.query(Playlist).filter_by(user_id=user_id).all()
        
        return jsonify([{
            "playlist_id": p.playlist_id,
            "playlist_name": p.playlist_name,
            "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None,
            "song_count": session.query(PlaylistSong).filter_by(playlist_id=p.playlist_id).count()
        } for p in playlists])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/users/<int:user_id>/playlists", methods=["POST"])
def create_playlist(user_id):
    data = request.json
    playlist_name = data.get('playlist_name')
    
    print(f"🎯 Creating playlist for user {user_id}: {playlist_name}")
    
    if not playlist_name:
        return jsonify({"error": "Playlist name is required"}), 400
    
    session = get_session()
    try:
        # Check if playlist with same name already exists for this user
        existing_playlist = session.query(Playlist).filter_by(
            user_id=user_id, 
            playlist_name=playlist_name
        ).first()
        
        if existing_playlist:
            return jsonify({"error": "You already have a playlist with this name"}), 400
        
        playlist = Playlist(
            user_id=user_id,
            playlist_name=playlist_name
            # created_at field doesn't exist in your Playlist model
        )
        
        session.add(playlist)
        session.commit()
        
        print(f"✅ Playlist created: {playlist.playlist_id}")
        
        return jsonify({
            "message": "Playlist created successfully",
            "playlist": {
                "playlist_id": playlist.playlist_id,
                "playlist_name": playlist.playlist_name
            }
        }), 201
    except Exception as e:
        session.rollback()
        print(f"❌ Playlist creation error: {str(e)}")
        return jsonify({"error": f"Failed to create playlist: {str(e)}"}), 500
    finally:
        session.close()

@app.route("/api/playlists/<int:playlist_id>")
def get_playlist(playlist_id):
    session = get_session()
    try:
        playlist = session.query(Playlist).filter_by(playlist_id=playlist_id).first()
        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404
        
        # Get songs for this playlist
        playlist_songs = session.query(Song).join(
            PlaylistSong, Song.song_id == PlaylistSong.song_id
        ).filter(PlaylistSong.playlist_id == playlist_id).all()
        
        return jsonify({
            "playlist_id": playlist.playlist_id,
            "playlist_name": playlist.playlist_name,
            "songs": [{
                "song_id": s.song_id,
                "title": s.title,
                "artist": s.artist,
                "file_path": s.file_path,
                "mood_tag": s.mood_tag
            } for s in playlist_songs]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/playlists/<int:playlist_id>/songs", methods=["POST"])
def add_song_to_playlist(playlist_id):
    data = request.json
    song_id = data.get('song_id')
    
    if not song_id:
        return jsonify({"error": "Song ID is required"}), 400
    
    session = get_session()
    try:
        existing = session.query(PlaylistSong).filter_by(playlist_id=playlist_id, song_id=song_id).first()
        if existing:
            return jsonify({"error": "Song already in playlist"}), 400
        
        playlist_song = PlaylistSong(playlist_id=playlist_id, song_id=song_id)
        session.add(playlist_song)
        session.commit()
        
        return jsonify({"message": "Song added to playlist"}), 201
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/playlists/<int:playlist_id>/songs/<int:song_id>", methods=["DELETE"])
def remove_song_from_playlist(playlist_id, song_id):
    session = get_session()
    try:
        playlist_song = session.query(PlaylistSong).filter_by(playlist_id=playlist_id, song_id=song_id).first()
        if not playlist_song:
            return jsonify({"error": "Song not in playlist"}), 404
        
        session.delete(playlist_song)
        session.commit()
        
        return jsonify({"message": "Song removed from playlist"})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/playlists/<int:playlist_id>", methods=["DELETE"])
def delete_playlist(playlist_id):
    session = get_session()
    try:
        playlist = session.query(Playlist).filter_by(playlist_id=playlist_id).first()
        if not playlist:
            return jsonify({"error": "Playlist not found"}), 404
        
        # First delete all songs from the playlist
        session.query(PlaylistSong).filter_by(playlist_id=playlist_id).delete()
        
        # Then delete the playlist
        session.delete(playlist)
        session.commit()
        
        return jsonify({"message": "Playlist deleted successfully"})
    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# ----------------- HISTORY ENDPOINTS -----------------
@app.route("/api/users/<int:user_id>/history")
def get_listening_history(user_id):
    session = get_session()
    try:
        history = session.query(ListeningHistory).filter_by(user_id=user_id).order_by(ListeningHistory.played_at.desc()).limit(50).all()
        
        return jsonify([{
            "id": h.id,  # Changed from history_id to id
            "song": {
                "song_id": h.song.song_id,
                "title": h.song.title,
                "artist": h.song.artist,
                "file_path": h.song.file_path,
                "mood_tag": h.song.mood_tag
            },
            "played_at": h.played_at.isoformat() if h.played_at else None
        } for h in history])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@app.route("/api/users/<int:user_id>/history", methods=["POST"])
def add_to_history(user_id):
    data = request.json
    song_id = data.get('song_id')
    
    print(f"📝 HISTORY: User {user_id} playing song {song_id}")
    
    if not song_id:
        return jsonify({"error": "Song ID is required"}), 400
    
    session = get_session()
    try:
        # Check if user and song exist
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        song = session.query(Song).filter_by(song_id=song_id).first()
        if not song:
            return jsonify({"error": "Song not found"}), 404
        
        # Create history entry
        history_entry = ListeningHistory(
            user_id=user_id,
            song_id=song_id,
            played_at=datetime.now()
        )
        
        session.add(history_entry)
        session.commit()
        
        print(f"✅ History saved: {song.title} for user {user.username}")
        
        return jsonify({
            "message": "Added to listening history",
            "id": history_entry.id,  # Changed from history_id to id
            "song_title": song.title
        }), 201
        
    except Exception as e:
        session.rollback()
        print(f"❌ History save error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
        
@app.route("/api/listening-history", methods=["POST"])
def save_listening_history():
    data = request.json
    user_id = data.get('user_id')
    song_id = data.get('song_id')
    play_duration = data.get('play_duration', 0)
    completed = data.get('completed', False)
    
    print(f"🎵 SAVING LISTENING HISTORY:")
    print(f"   User ID: {user_id}")
    print(f"   Song ID: {song_id}")
    print(f"   Play Duration: {play_duration}s")
    print(f"   Completed: {completed}")
    
    if not all([user_id, song_id]):
        return jsonify({"error": "User ID and Song ID are required"}), 400
    
    session = get_session()
    try:
        # Check if user and song exist
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            print(f"❌ User not found: {user_id}")
            return jsonify({"error": "User not found"}), 404
            
        song = session.query(Song).filter_by(song_id=song_id).first()
        if not song:
            print(f"❌ Song not found: {song_id}")
            return jsonify({"error": "Song not found"}), 404
        
        # Create history entry
        history_entry = ListeningHistory(
            user_id=user_id,
            song_id=song_id,
            played_at=datetime.now()
        )
        
        session.add(history_entry)
        session.commit()
        
        print(f"✅ History saved successfully:")
        print(f"   User: {user.username}")
        print(f"   Song: {song.title}")
        print(f"   Duration: {play_duration}s")
        print(f"   History ID: {history_entry.id}")
        
        return jsonify({
            "message": "Listening history saved successfully",
            "id": history_entry.id,  # Changed from history_id to id
            "song_title": song.title,
            "play_duration": play_duration,
            "completed": completed
        }), 201
        
    except Exception as e:
        session.rollback()
        print(f"❌ History save error: {str(e)}")
        return jsonify({"error": f"Failed to save history: {str(e)}"}), 500
    finally:
        session.close()

# ----------------- RECOMMENDATIONS -----------------
@app.route("/api/recommend_songs/<int:user_id>")
def recommend_songs(user_id):
    weather = request.args.get("weather", "Sunny")
    
    session = get_session()
    try:
        all_moods = session.query(Song.mood_tag).distinct().all()
        available_moods = [m[0] for m in all_moods if m[0]]
        
        if not available_moods:
            available_moods = ["happy", "energetic", "calm", "sad", "romantic"]
        
        weather_mood_map = {
            "Sunny": ["happy", "energetic", "upbeat"],
            "Rainy": ["calm", "sad", "romantic", "chill"],
            "Cloudy": ["calm", "melancholic", "focused"],
            "Snow": ["calm", "cozy", "happy"]
        }
        
        weather_moods = weather_mood_map.get(weather, ["happy", "energetic"])
        final_moods = list(set(weather_moods + available_moods))[:4]
        
        recommended = []
        for mood in final_moods:
            mood_songs = session.query(Song).filter(Song.mood_tag.ilike(f"%{mood}%")).limit(5).all()
            recommended.extend(mood_songs)
        
        seen = set()
        unique_songs = []
        for song in recommended:
            identifier = (song.title, song.artist)
            if identifier not in seen:
                seen.add(identifier)
                unique_songs.append(song)
        
        if not unique_songs:
            unique_songs = session.query(Song).limit(10).all()
        
        return jsonify([{
            "song_id": s.song_id,
            "title": s.title,
            "artist": s.artist,
            "file_path": s.file_path,
            "mood_tag": s.mood_tag or "Unknown"
        } for s in unique_songs[:20]])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

# ----------------- DEBUG & UTILITY ENDPOINTS -----------------
@app.route("/api/debug/users")
def debug_users():
    session = get_session()
    try:
        users = session.query(User).all()
        user_list = []
        for user in users:
            user_list.append({
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email
            })
        return jsonify({
            'total_users': len(users),
            'users': user_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route("/api/create-test-user")
def create_test_user():
    session = get_session()
    try:
        existing = session.query(User).filter_by(username='testuser').first()
        if existing:
            return jsonify({
                'message': 'Test user already exists', 
                'username': existing.username,
                'email': existing.email
            })
        
        test_user = User(
            username='testuser',
            email='test@example.com',
            password_hash='testpass'
        )
        session.add(test_user)
        session.commit()
        
        return jsonify({
            'message': 'Test user created successfully',
            'username': 'testuser', 
            'password': 'testpass',
            'email': 'test@example.com'
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route("/api/health")
def health_check():
    try:
        session = get_session()
        song_count = session.query(Song).count()
        user_count = session.query(User).count()
        session.close()
        
        return jsonify({
            "status": "Backend is running!", 
            "database": "connected",
            "songs_in_database": song_count,
            "users_in_database": user_count,
            "mood_detector": "active"
        })
    except Exception as e:
        return jsonify({"status": "Backend error", "error": str(e)}), 500

@app.route("/api/debug/history-structure/<int:user_id>")
def debug_history_structure(user_id):
    """Debug endpoint to check history data structure"""
    session = get_session()
    try:
        history = session.query(ListeningHistory).filter_by(user_id=user_id).order_by(ListeningHistory.played_at.desc()).limit(10).all()
        
        history_list = []
        for entry in history:
            history_list.append({
                'id': entry.id,  # Changed from history_id to id
                'user_id': entry.user_id,
                'song_id': entry.song_id,
                'played_at': entry.played_at.isoformat() if entry.played_at else None,
                'song_title': entry.song.title if entry.song else 'No song found'
            })
        
        return jsonify({
            'total_history_entries': len(history),
            'user_id': user_id,
            'history_entries': history_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route("/api/test-mood-detection", methods=["POST"])
def test_mood_detection():
    data = request.json
    youtube_url = data.get('youtube_url')
    
    if not youtube_url:
        return jsonify({'error': 'YouTube URL is required'}), 400
    
    try:
        result = mood_detector.process_youtube_url(youtube_url)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ----------------- ADD THESE NEW ENDPOINTS FOR FRONTEND COMPATIBILITY -----------------

@app.route("/api/users/current")
def get_current_user():
    """Get current user info - for frontend compatibility"""
    # This is a placeholder - in a real app you'd use sessions/tokens
    return jsonify({"message": "Use login endpoint to get user data"})

@app.route("/api/check-auth")
def check_auth():
    """Check if user is authenticated - for frontend compatibility"""
    # This is a placeholder - in a real app you'd verify JWT tokens
    return jsonify({"authenticated": False})

# ----------------- ERROR HANDLING -----------------
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# ----------------- MAIN -----------------
if __name__ == "__main__":
    print("🎵 Starting Music Mood Backend...")
    print("📍 http://localhost:5000")
    print("📊 Available endpoints:")
    print("   AUTH:    POST /api/signup, POST /api/login")
    print("   SONGS:   GET /api/songs, POST /api/upload-song")
    print("   SEARCH:  GET /api/search")
    print("   FAVORITES: GET/POST/DELETE /api/users/<user_id>/favorites")
    print("   PLAYLISTS: GET/POST/DELETE /api/users/<user_id>/playlists")
    print("   HISTORY: GET/POST /api/users/<user_id>/history, POST /api/listening-history")
    print("   RECOMMEND: GET /api/recommend_songs/<user_id>")
    print("   DEBUG:   GET /api/debug/users, GET /api/create-test-user, GET /api/debug/history-structure/<user_id>")
    print("   HEALTH:  GET /api/health")
    app.run(debug=True, port=5000)