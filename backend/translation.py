from deep_translator import GoogleTranslator
import time

def translate_text(detection_text: str) -> str:
    """Translates text from English to Hindi using deep_translator."""
    if not detection_text or detection_text == "No objects detected":
        return "कोई वस्तु नहीं मिली"
        
    try:
        translator = GoogleTranslator(source='en', target='hi')
        
        # Handle multiple objects in detection text
        if "," in detection_text:
            objects = [obj.strip() for obj in detection_text.split(",")]
            translations = []
            
            for obj in objects:
                translated = translator.translate(obj)
                translations.append(translated if translated else obj)
                print(f"✅ Translated: {obj} -> {translated}")
                time.sleep(0.1)  # Small delay between translations
            
            return ", ".join(translations)
        
        # Handle single object
        translated = translator.translate(detection_text)
        print(f"✅ Translated: {detection_text} -> {translated}")
        return translated if translated else detection_text
        
    except Exception as e:
        print(f"⚠️ Translation error for '{detection_text}': {str(e)}")
        return detection_text