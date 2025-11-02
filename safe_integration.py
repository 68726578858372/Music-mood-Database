# safe_song_recovery.py
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
    """Remove unwanted characters from title"""
    title = re.sub(r'\[[^\]]*\]|\([^\)]*\)', '', title)
    title = re.sub(r'official|video|audio|lyrics|hd|4k', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s+', ' ', title).strip()
    return title

def detect_mood_from_title(title):
    """Simple mood detection"""
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
    """Search YouTube safely"""
    try:
        request = YOUTUBE.search().list(
            part="snippet",
            q=query + " music",
            type="video",
            maxResults=max_results,
            videoCategoryId="10"
        )
        response = request.execute()
        
        results = []
        for item in response["items"]:
            raw_title = item["snippet"]["title"]
            clean_name = clean_title(raw_title)
            artist = item["snippet"]["channelTitle"]
            video_id = item["id"]["videoId"]
            
            youtube_url = f"https://www.youtube.com/watch?v={video_id}"
            mood = detect_mood_from_title(raw_title)
            
            results.append({
                'title': clean_name,
                'artist': artist,
                'url': youtube_url,
                'mood': mood
            })
            
        return results
        
    except Exception as e:
        print(f"❌ YouTube API error: {e}")
        return []

def safe_song_recovery():
    """Safely recover songs without breaking existing data"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Safe search topics
    safe_topics = [
        "kannada film songs",
        "english pop 2024",
        "hindi bollywood hits", 
        "tamil movie songs",
        "telugu music",
        "instrumental relax",
        "workout music",
        "romantic songs"
    ]
    
    total_added = 0
    for topic in safe_topics:
        print(f"🔍 Searching: {topic}")
        songs = search_youtube_songs(topic, max_results=15)
        
        for song in songs:
            try:
                # Use INSERT IGNORE to avoid duplicates
                cursor.execute("""
                    INSERT IGNORE INTO songs (title, artist, file_path, mood_tag)
                    VALUES (%s, %s, %s, %s)
                """, (song['title'], song['artist'], song['url'], song['mood']))
                
                if cursor.rowcount > 0:
                    print(f"✅ Added: {song['title']} - {song['mood']}")
                    total_added += 1
                else:
                    print(f"⚠️ Skipped duplicate: {song['title']}")
                    
            except Exception as e:
                print(f"❌ Error: {song['title']} - {e}")
                continue
    
    conn.commit()
    cursor.close()
    conn.close()
    print(f"\n🎉 Recovery Complete! Added {total_added} new songs safely!")

if __name__ == "__main__":
    safe_song_recovery()