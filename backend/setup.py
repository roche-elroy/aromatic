import os
import subprocess
import sys

def setup_env():
    """Set up the Python environment for the object detection backend."""
    print("📦 Setting up Python environment for object detection...")
    
    # Create virtual environment
    if not os.path.exists("venv"):
        print("🔄 Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"])
    
    # Determine the pip executable
    if os.name == "nt":  # Windows
        pip_exec = os.path.join("venv", "Scripts", "pip")
    else:  # Unix/Linux/MacOS
        pip_exec = os.path.join("venv", "bin", "pip")
    
    # Upgrade pip
    print("🔄 Upgrading pip...")
    subprocess.run([pip_exec, "install", "--upgrade", "pip"])
    
    # Install requirements
    print("🔄 Installing required packages...")
    subprocess.run([pip_exec, "install", "-r", "requirements.txt"])
    
    # Download YOLOv8 model if not exists
    if not os.path.exists("yolov8n.pt"):
        print("🔄 Downloading YOLOv8n model...")
        subprocess.run([os.path.join("venv", "bin", "python") if os.name != "nt" else 
                       os.path.join("venv", "Scripts", "python"), 
                       "-c", "from ultralytics import YOLO; YOLO('yolov8n.pt')"])
    
    # Make the start script executable on Unix-like systems
    if os.name != "nt":
        os.chmod("start_server.sh", 0o755)
    
    print("✅ Setup completed successfully! Run ./start_server.sh to start the detection server.")

if __name__ == "__main__":
    setup_env()
