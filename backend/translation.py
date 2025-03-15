from deep_translator import GoogleTranslator
import time

def translate_text(detection_text: str, target_lang: str, source_lang: str = "en") -> str:
    """Translates detected text to target language."""
    if not detection_text:
        return ""

    # Don't translate if target is English
    if target_lang == "en":
        return detection_text
        
    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        
        # Handle special case for "No objects detected"
        if detection_text == "No objects detected":
            special_translations = {
                "hi": "कोई वस्तु नहीं मिली",
                "es": "No se detectaron objetos",
                # Add more languages as needed
            }
            return special_translations.get(target_lang, detection_text)

        # Handle comma-separated objects
        if "," in detection_text:
            objects = [obj.strip() for obj in detection_text.split(",")]
            translations = []
            
            for obj in objects:
                translated = translator.translate(obj)
                translations.append(translated if translated else obj)
                time.sleep(0.1)  # Prevent rate limiting
            
            translated_text = ", ".join(translations)
            print(f"✅ Translated: {detection_text} => {translated_text} ({target_lang})")
            return translated_text
        
        # Handle single object
        translated = translator.translate(detection_text)
        print(f"✅ Translated: {detection_text} => {translated} ({target_lang})")
        return translated if translated else detection_text
        
    except Exception as e:
        print(f"⚠️ Translation error: {str(e)}")
        return detection_text