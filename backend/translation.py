from deep_translator import GoogleTranslator
from functools import lru_cache

# Pre-defined translations for common phrases
COMMON_TRANSLATIONS = {
    "hi": {
        "No objects detected": "कोई वस्तु नहीं मिली",
        "Translation Settings": "भाषा सेटिंग्स",
        "Select Language": "भाषा चुनें",
        "English": "अंग्रेज़ी",
        "Hindi": "हिंदी"
    }
}

@lru_cache(maxsize=1000)
def get_cached_translation(text: str, source_lang: str, target_lang: str) -> str:
    """Cached translation with source language support."""
    if source_lang == target_lang:
        return text

    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        result = translator.translate(text)
        return result if result else text
    except Exception as e:
        print(f"⚠️ Translation error: {str(e)}")
        return text

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Main translation function with source/target language support."""
    if not text or source_lang == target_lang:
        return text

    try:
        # Handle multiple objects
        if "," in text:
            objects = [obj.strip() for obj in text.split(",")]
            translations = [
                get_cached_translation(obj, source_lang, target_lang) 
                for obj in objects
            ]
            return ", ".join(translations)

        return get_cached_translation(text, source_lang, target_lang)

    except Exception as e:
        print(f"⚠️ Translation error: {str(e)}")
        return text