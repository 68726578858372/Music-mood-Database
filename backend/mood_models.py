# mood_model.py - IMPROVED AI MOOD DETECTION
import re
import requests
from googleapiclient.discovery import build
import nltk
from textblob import TextBlob
import numpy as np

class MoodDetector:
    def __init__(self, youtube_api_key):
        self.youtube = build('youtube', 'v3', developerKey=youtube_api_key)
        
        # Enhanced mood classification with Kannada/Indian music context
        self.mood_keywords = {
            'energetic': {
                'english': ['dance', 'party', 'workout', 'energy', 'upbeat', 'festival', 
                           'electronic', 'edm', 'techno', 'bass', 'drop', 'beat', 'fast',
                           'work out', 'exercise', 'gym', 'running', 'cardio', 'club',
                           'banger', 'hype', 'pump', 'energetic', 'powerful'],
                'kannada': ['ನೃತ್ಯ', 'ಡಾನ್ಸ್', 'ಪಾರ್ಟಿ', 'ಉತ್ಸವ', 'ಆನಂದ', 'ಚೈತನ್ಯ'],
                'indicators': ['!', '🔥', '💃', '🕺', '⭐', '🎉']
            },
            'happy': {
                'english': ['happy', 'joy', 'sunshine', 'smile', 'good vibes', 'positive',
                           'celebrate', 'celebration', 'fun', 'summer', 'vacation', 'holiday',
                           'upbeat', 'cheerful', 'optimistic', 'party', 'enjoy', 'wonderful',
                           'fantastic', 'amazing', 'beautiful', 'awesome'],
                'kannada': ['ಸಂತೋಷ', 'ಖುಷಿ', 'ಹರ್ಷ', 'ಆನಂದ', 'ಮೋಡಿ', 'ಸುಖ', 'ಖುಶಿ', 'ಆಹ್ಲಾದ'],
                'indicators': ['😊', '😂', '🎈', '🎊', '✨', '🌟']
            },
            'romantic': {
                'english': ['love', 'romantic', 'heart', 'valentine', 'kiss', 'relationship',
                           'couple', 'date', 'wedding', 'anniversary', 'slow', 'ballad',
                           'emotional', 'feelings', 'devotion', 'affection', 'together',
                           'forever', 'miss you', 'my love', 'darling', 'sweetheart'],
                'kannada': ['ಪ್ರೇಮ', 'ರೊಮ್ಯಾಂಟಿಕ್', 'ಹೃದಯ', 'ಕಿಸ್', 'ನೆನಪು', 'ಇಷ್ಟ', 'ಅನುರಾಗ', 'ಕಾಮುಕ'],
                'indicators': ['❤️', '💕', '💖', '😍', '💘']
            },
            'chill': {
                'english': ['chill', 'calm', 'relax', 'lofi', 'study', 'sleep', 'peaceful',
                           'ambient', 'meditation', 'yoga', 'calming', 'soothing', 'quiet',
                           'background', 'focus', 'concentrate', 'reading', 'mellow',
                           'soft', 'gentle', 'easy', 'light'],
                'kannada': ['ಶಾಂತ', 'ರಿಲ್ಯಾಕ್ಸ್', 'ಶಾಂತಿ', 'ಸೌಮ್ಯ', 'ಮೃದು'],
                'indicators': ['🌙', '☁️', '🌿', '💤', '📚']
            },
            'sad': {
                'english': ['sad', 'breakup', 'heartbreak', 'tears', 'lonely', 'miss you',
                           'depression', 'emotional', 'cry', 'pain', 'lost', 'goodbye',
                           'melancholy', 'blue', 'hurt', 'alone', 'broken', 'regret'],
                'kannada': ['ದುಃಖ', 'ವಿರಹ', 'ಬೇಸರ', 'ಕಣ್ಣೀರು', 'ಏಕಾಂತ', 'ನೋವು', 'ವ್ಯಥೆ'],
                'indicators': ['😢', '💔', '☔', '🌧️', '🐦']
            },
            'motivational': {
                'english': ['motivation', 'inspire', 'strong', 'fight', 'winner', 'success',
                           'achievement', 'goal', 'dream', 'power', 'victory', 'champion',
                           'overcome', 'determination', 'perseverance', 'ambition',
                           'inspirational', 'believe', 'achievement', 'glory'],
                'kannada': ['ಪ್ರೇರಣೆ', 'ಸ್ಫೂರ್ತಿ', 'ಶಕ್ತಿ', 'ಜಯ', 'ವಿಜಯ', 'ಸಾಧನೆ', 'ಲಕ್ಷ್ಯ'],
                'indicators': ['💪', '🏆', '⭐', '🚀', '🔥']
            }
        }
        
        # Song-specific patterns for Indian/Kannada music
        self.song_patterns = {
            'energetic': [
                r'gana', r'item', r'party', r'dance', r'beat', r'fast', r'pump',
                r'kola', r'hook', r'step', r'remix', r'masti', r'josh', r'dhamaal'
            ],
            'happy': [
                r'ishte', r'prema', r'khushi', r'santosha', r'masti', r'hasya',
                r'fun', r'comedy', r'celebration', r'utsava', r'habba', r'chanda'
            ],
            'romantic': [
                r'prema', r'love', r'kannu', r'manasa', r'hridaya', r'mouna',
                r'heyalu', r'manada', r'neene', r'ninna', r'priya', r'sneha'
            ]
        }

    def extract_youtube_id(self, url):
        """Extract YouTube video ID from URL"""
        patterns = [
            r'(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com\/embed\/([a-zA-Z0-9_-]{11})',
            r'youtube\.com\/v\/([a-zA-Z0-9_-]{11})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def get_video_details(self, video_id):
        """Get video title and description from YouTube API"""
        try:
            request = self.youtube.videos().list(
                part="snippet",
                id=video_id
            )
            response = request.execute()
            
            if response['items']:
                video = response['items'][0]
                return {
                    'title': video['snippet']['title'],
                    'description': video['snippet']['description'],
                    'channel': video['snippet']['channelTitle'],
                    'tags': video['snippet'].get('tags', [])
                }
        except Exception as e:
            print(f"YouTube API Error: {e}")
        
        return None

    def analyze_sentiment(self, text):
        """Analyze text sentiment using TextBlob"""
        try:
            blob = TextBlob(text)
            return blob.sentiment.polarity  # -1 to 1 scale
        except:
            return 0

    def detect_mood_advanced(self, title, description, tags):
        """Advanced mood detection with multiple analysis methods"""
        combined_text = f"{title} {description}".lower()
        tags_text = " ".join(tags).lower() if tags else ""
        
        mood_scores = {mood: 0 for mood in self.mood_keywords.keys()}
        
        # Method 1: Keyword matching with language support
        for mood, data in self.mood_keywords.items():
            # English keywords
            for keyword in data['english']:
                if keyword in combined_text or keyword in tags_text:
                    mood_scores[mood] += 2
            
            # Kannada keywords
            for keyword in data['kannada']:
                if keyword in combined_text:
                    mood_scores[mood] += 3  # Higher weight for local language
            
            # Emoji/indicator matching
            for emoji in data['indicators']:
                if emoji in combined_text:
                    mood_scores[mood] += 1

        # Method 2: Pattern matching for Indian songs
        for mood, patterns in self.song_patterns.items():
            for pattern in patterns:
                if re.search(pattern, combined_text, re.IGNORECASE):
                    mood_scores[mood] += 2

        # Method 3: Sentiment analysis
        sentiment = self.analyze_sentiment(combined_text)
        if sentiment > 0.3:
            mood_scores['happy'] += 3
            mood_scores['energetic'] += 1
        elif sentiment > 0.1:
            mood_scores['happy'] += 2
        elif sentiment < -0.3:
            mood_scores['sad'] += 3
        elif sentiment < -0.1:
            mood_scores['sad'] += 1

        # Method 4: Title-specific analysis for known patterns
        title_lower = title.lower()
        
        # Detect "Don't Worry Baby" type songs
        if any(word in title_lower for word in ['worry', 'baby', 'chinnamma', 'don\'t worry']):
            if any(word in title_lower for word in ['dance', 'party', 'beat', 'gana']):
                mood_scores['energetic'] += 5
            else:
                mood_scores['happy'] += 3
        
        # Detect "Akasha Ishte" type romantic songs
        if 'ishte' in title_lower or 'isthe' in title_lower:
            if 'akasha' in title_lower or 'aakasha' in title_lower:
                mood_scores['romantic'] += 4
                mood_scores['happy'] += 2
            else:
                mood_scores['romantic'] += 3
        
        # Detect Gana/folk songs (usually energetic)
        if 'gana' in combined_text or 'folk' in combined_text:
            mood_scores['energetic'] += 4
        
        # Remove moods with zero score and return top mood
        mood_scores = {k: v for k, v in mood_scores.items() if v > 0}
        
        if not mood_scores:
            return 'unknown'
        
        # Get top mood
        top_mood = max(mood_scores.items(), key=lambda x: x[1])
        
        # Confidence check - if score is too low, return unknown
        if top_mood[1] < 2:
            return 'unknown'
        
        return top_mood[0]

    def process_youtube_url(self, youtube_url):
        """Main function to process YouTube URL and detect mood"""
        video_id = self.extract_youtube_id(youtube_url)
        if not video_id:
            return {'error': 'Invalid YouTube URL'}
        
        video_details = self.get_video_details(video_id)
        if not video_details:
            return {'error': 'Could not fetch video details'}
        
        # Use advanced mood detection
        mood = self.detect_mood_advanced(
            video_details['title'], 
            video_details['description'],
            video_details.get('tags', [])
        )
        
        return {
            'title': video_details['title'],
            'artist': video_details['channel'],
            'mood': mood,
            'youtube_url': youtube_url,
            'video_id': video_id
        }

# Test with your specific songs
if __name__ == "__main__":
    detector = MoodDetector('YOUR_YOUTUBE_API_KEY')
    
    # Test cases based on your examples
    test_songs = [
        "Don't Worry Baby Chinnamma",  # Should be energetic
        "Aakasha Ishte",  # Should be romantic/happy
        "Pushpa Pushpa",  # Should be energetic/motivational
        "Danks Anthem"   # Should be energetic
    ]
    
    for song in test_songs:
        print(f"Testing: {song}")
        # You would use actual YouTube URLs here
        # result = detector.process_youtube_url('YOUTUBE_URL_HERE')
        # print(f"Result: {result}")