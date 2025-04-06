# Real-Time Object Detection App

This application demonstrates real-time object detection using React Native (Expo) and a Python backend powered by YOLO (You Only Look Once).

# Note 1:
      
    In src\components\camera\Camera.tsx and src\context\TranslationContext.tsx 
    const SERVER_IP = "192.168..";  
    replace with your actual IP address 
    
# Note 2:

    backend\twilio_calls.py after the part
    router = APIRouter()
    add the secret key 

# Note 3:

    In src\components\emergency\Emergency.tsx
    The function definiation of makeEmergencyCall,sendEmergencyMessage,sendWhatsAppMessage
    const response = await axios.post('http://192.168.1.10:8000/send-whatsapp', {
    Change it to your ip address

# Note 4:

    `python setup.py` and `npm install` in terminal to install required dependencies

# Note 5:

    To change the emergency call content change in backend\twilio_calls.py at twiml=<Response></Response>
    To change sms,whatsapp content change in src\components\emergency\Emergency.tsx at the onpress function calls
