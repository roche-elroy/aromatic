from googletrans import Translator

def translate_text(detection_text):
    """Translates text from English to Hindi."""
    try:
        translator = Translator()
        translated_text = translator.translate(detection_text, src="en", dest="hi").text
        return translated_text
    except Exception as e:
        print(f"⚠️ Translation error: {e}")
        return "Translation unavailable"
