# Speech-to-text and text-to-speech helpers
import pyttsx3
import speech_recognition as sr
import time

# Initialize text-to-speech engine
# try:
#     engine = pyttsx3.init()
    
#     # Get available voices
#     voices = engine.getProperty('voices')
    
#     # Try to set a female voice
#     female_voice = None
#     for voice in voices:
#         # Look for female voice indicators
#         if any(indicator in voice.name.lower() for indicator in ['female', 'woman', 'girl', 'zira', 'hazel']):
#             female_voice = voice
#             break
    
#     # If no specific female voice found, use the first available voice
#     if female_voice:
#         engine.setProperty('voice', female_voice.id)
#     else:
#         # Use the first available voice (usually index 1 is female on Windows)
#         if len(voices) > 1:
#             engine.setProperty('voice', voices[1].id)
#         else:
#             engine.setProperty('voice', voices[0].id)
    
#     # Set speech rate and volume for Gwen - more natural conversation pace
#     engine.setProperty('rate', 135)  # Slightly slower for clearer, more natural speech
#     engine.setProperty('volume', 0.9)  # Volume level
    
# except Exception as e:
#     print(f"Failed to initialize text-to-speech engine: {e}")
#     engine = None
def get_enginge():
    engine = pyttsx3.init()
    rate = engine.getProperty('rate')
    engine.setProperty('rate', rate + 100)
    return engine

def speak(text):
    """Convert text to speech with Gwen's voice - with error logging."""
    engine = get_enginge()
    if engine:
        try:
            engine.say(text)
            engine.runAndWait()
            # Add a small pause for more natural conversation flow
            time.sleep(0.5)
        except Exception as e:
            # Print the error to diagnose the issue instead of failing silently
            print(f"An error occurred in the speak function: {e}")
    else:
        # If no engine, print a message and wait to simulate speech
        print("Text-to-speech engine not initialized. Simulating speech.")
        time.sleep(len(text) * 0.1)

def listen(timeout=15, phrase_time_limit=20):
    """
    Listen for voice input and convert to text - completely voice-based interview.
    
    Args:
        timeout (int): Timeout in seconds for listening (increased for interview setting)
        phrase_time_limit (int): Maximum time for a single phrase (increased for detailed answers)
    
    Returns:
        str: Recognized text or error message
    """
    recognizer = sr.Recognizer()
    
    # Adjust for ambient noise
    try:
        with sr.Microphone() as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            try:
                audio = recognizer.listen(source, timeout=timeout, phrase_time_limit=phrase_time_limit)
                
                # Try Google Speech Recognition first
                try:
                    text = recognizer.recognize_google(audio)
                    print(f"Recognized text: {text}")  # Debugging output
                    if text and text.strip():
                        return text.strip()
                    else:
                        return "Sorry, I didn't catch that. Could you please repeat?"
                except sr.UnknownValueError:
                    return "Sorry, I didn't catch that. Could you please repeat?"
                except sr.RequestError as e:
                    return "Sorry, there was an error with speech recognition. Please try again."
                    
            except sr.WaitTimeoutError:
                return "Sorry, I didn't hear anything. Please try again."
                
    except Exception as e:
        return "Sorry, there was an error with the microphone. Please check your audio settings."

def test_audio():
    """Test function to verify audio functionality."""
    speak("Hello! I'm Gwen, your AI interview assistant. This is a test of my voice.")
    
    # Test speech-to-text
    speak("Now I'll test the speech recognition. Please say something when I finish speaking.")
    time.sleep(1)
    
    result = listen()
    speak(f"I heard you say: {result}")
    
    return result