from googleapiclient.discovery import build
import mysql.connector
import re

API_KEY = "AIzaSyBapJoEbKSsscFcCzdkmXdxS2i1K1f-_Ro"
YOUTUBE = build("youtube", "v3", developerKey=API_KEY)

DB_CONFIG = {
    "host": "localhost",
    "user": "root", 
    "password": "Gowda@1685",
    "database": "music_mood_db"
}

def clean_title(title):
    """Remove unwanted characters and extract clean title"""
    # Remove [Official Video], (Official Audio) etc.
    title = re.sub(r'\[[^\]]*\]|\([^\)]*\)', '', title)
    # Remove common tags
    title = re.sub(r'official|video|audio|lyrics|hd|4k', '', title, flags=re.IGNORECASE)
    # Clean up extra spaces
    title = re.sub(r'\s+', ' ', title).strip()
    return title

def detect_mood_from_title(title):
    """Simple mood detection based on keywords in title"""
    title_lower = title.lower()
    
    mood_keywords = {
        'energetic': ['dance', 'party', 'workout', 'energy', 'upbeat', 'festival'],
        'chill': ['chill', 'calm', 'relax', 'lofi', 'study', 'sleep', 'peaceful'],
        'happy': ['happy', 'joy', 'sunshine', 'smile', 'good vibes'],
        'romantic': ['love', 'romantic', 'heart', 'valentine', 'kiss'],
        'sad': ['sad', 'breakup', 'heartbreak', 'tears', 'lonely', 'miss you'],
        'motivational': ['motivation', 'inspire', 'strong', 'fight', 'winner']
    }
    
    for mood, keywords in mood_keywords.items():
        if any(keyword in title_lower for keyword in keywords):
            return mood
    
    return 'unknown'

def search_youtube_songs(query, max_results=10):
    """Search YouTube and return clean song data"""
    try:
        request = YOUTUBE.search().list(
            part="snippet",
            q=query + " music",  # Add music to get better results
            type="video",
            maxResults=max_results,
            videoCategoryId="10"  # Music category only
        )
        response = request.execute()
        
        results = []
        for item in response["items"]:
            raw_title = item["snippet"]["title"]
            clean_name = clean_title(raw_title)
            artist = item["snippet"]["channelTitle"]
            video_id = item["id"]["videoId"]
            
            # Use direct YouTube URL (NOT audio extraction)
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            
            # Detect mood from title
            mood = detect_mood_from_title(raw_title)
            
            results.append({
                'title': clean_name,
                'artist': artist,
                'url': youtube_url,
                'mood': mood,
                'raw_title': raw_title
            })
            
        return results
        
    except Exception as e:
        print(f"❌ YouTube API error: {e}")
        return []

def insert_songs_to_db(songs):
    """Insert songs into database"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    inserted_count = 0
    for song in songs:
        try:
            cursor.execute("""
                INSERT INTO songs (title, artist, file_path, mood_tag)
                VALUES (%s, %s, %s, %s)
            """, (song['title'], song['artist'], song['url'], song['mood']))
            inserted_count += 1
            print(f"✅ Added: {song['title']} - {song['mood']}")
            
        except mysql.connector.IntegrityError:
            print(f"⚠️ Skipped duplicate: {song['title']}")
            continue
        except Exception as e:
            print(f"❌ Error inserting {song['title']}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"🎵 Successfully inserted {inserted_count} songs!")

def clear_existing_songs():
    """Clear existing songs to start fresh"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Disable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Clear related tables first
        cursor.execute("DELETE FROM listening_history")
        cursor.execute("DELETE FROM user_favorites") 
        cursor.execute("DELETE FROM playlists_songs")
        
        # Clear songs table
        cursor.execute("DELETE FROM songs")
        cursor.execute("ALTER TABLE songs AUTO_INCREMENT = 1")
        
        # Re-enable foreign key checks
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        
        conn.commit()
        cursor.close()
        conn.close()
        print("🗑️ Cleared all existing songs!")
        
    except Exception as e:
        print(f"❌ Error clearing songs: {e}")

if __name__ == "__main__":
    # Step 1: Clear existing data
    clear_existing_songs()
    
    # Step 2: Search and insert new songs
    search_topics = [
        "Kannada film songs",
        "English pop music", 
        "Hindi Bollywood songs",
        "Tamil movie songs",
        "Telugu music",
        "Lofi chill study music",
        "Dance workout music",
        "Romantic love songs"
    ]
    
    total_inserted = 0
    for topic in search_topics:
        print(f"\n🔍 Searching for: {topic}")
        songs = search_youtube_songs(topic, max_results=15)
        
        if songs:
            insert_songs_to_db(songs)
            total_inserted += len(songs)
        else:
            print(f"❌ No results for: {topic}")
    
    print(f"\n🎉 COMPLETED! Total {total_inserted} songs added to database!")