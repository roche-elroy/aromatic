from deep_translator import GoogleTranslator
import time

def translate_text(detection_text: str, source_lang: str = 'en', target_lang: str = 'hi') -> str:
    if not detection_text:
        return ""
        
    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        
        if "," in detection_text:
            objects = [obj.strip() for obj in detection_text.split(",")]
            translations = []
            
            for obj in objects:
                translated = translator.translate(obj)
                translations.append(translated if translated else obj)
                time.sleep(0.1)
            
            return ", ".join(translations)
        
        translated = translator.translate(detection_text)
        print(f"✅ Translated: {detection_text} -> {translated}")
        return translated if translated else detection_text
        
    except Exception as e:
        print(f"⚠️ Translation error: {str(e)}")
        return detection_text