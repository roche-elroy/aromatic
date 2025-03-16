from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
import datetime
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware

# Secret key for JWT
SECRET_KEY = "9f4b1e8a0c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f"  # Replace with a strong, random key
ALGORITHM = "HS256"
TOKEN_EXPIRY_MINUTES = 60  # Token validity (1 hour)

app = FastAPI()

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (Change this in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary database to store device IDs
users_db = {}

class User(BaseModel):
    device_id: str

def create_token(device_id: str):
    """Generate a JWT token."""
    payload = {
        "device_id": device_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=TOKEN_EXPIRY_MINUTES)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/authenticate")
async def authenticate(user: User):
    """Authenticate or register user based on device_id"""
    if user.device_id in users_db:
        token = create_token(user.device_id)
        users_db[user.device_id]["token"] = token  # Store token
        return {"status": "authenticated", "token": token}

    # Register new user
    token = create_token(user.device_id)
    users_db[user.device_id] = {"device_id": user.device_id, "token": token}
    return {"status": "registered", "token": token}

@app.post("/verify")
async def verify(token: str):
    """Verify stored token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        device_id = payload.get("device_id")

        # Check if the device exists AND the token matches
        if device_id in users_db and users_db[device_id]["token"] == token:
            return {"status": "authenticated"}
        
        return {"status": "unauthorized"}
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/protected")
async def protected_route(token: str):
    """Access protected route"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"message": "Access granted", "device_id": payload["device_id"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized access")
