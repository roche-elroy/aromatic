import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",  # Allow connections from all interfaces
        port=8000,
        reload=True,      # Enable auto-reload
        access_log=True,  # Enable access logs
    )