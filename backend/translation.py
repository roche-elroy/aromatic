from googletrans import Translator

def translate_text(detection_text):
    translator = Translator()
    translated_text = translator.translate(detection_text, src="en", dest="hi").text
    return translated_text
