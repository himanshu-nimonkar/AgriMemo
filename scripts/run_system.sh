#!/bin/bash
# AgriMemo System Runner

echo "=== AgriMemo Control Script ==="
echo ""

if [ "$1" = "start" ]; then
    echo "Starting the application stack (Docker Compose)..."
    docker compose up -d --build
    echo "Containers are spinning up. The frontend will be available at http://localhost:5173"
    echo "The API will be available at http://localhost:8000/docs"
elif [ "$1" = "stop" ]; then
    echo "Stopping the application stack..."
    docker compose down
elif [ "$1" = "local-start" ]; then
    echo "Starting application locally (Non-Docker)..."
    export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin
    
    # Dependency Check
    if ! command -v ffmpeg &> /dev/null || ! command -v ffprobe &> /dev/null; then
        echo "❌ Error: FFmpeg/FFprobe not found!"
        echo "AgriMemo needs FFmpeg for audio processing. Please install it first:"
        echo "  brew install ffmpeg"
        exit 1
    fi

    # Backend Setup
    echo "Setting up Backend..."
    cd backend
    if [ ! -d ".venv" ]; then
        python3 -m venv .venv
    fi
    source .venv/bin/activate
    pip install -q -r requirements.txt
    echo "Starting Backend on port 8000..."
    nohup python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../.backend.pid
    cd ..

    # Frontend Setup
    echo "Setting up Frontend..."
    cd frontend
    npm install -q
    echo "Starting Frontend on port 5173..."
    nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../.frontend.pid
    cd ..

    echo "Services started in the background."
    echo "Backend logs: backend/backend.log (PID: $BACKEND_PID)"
    echo "Frontend logs: frontend/frontend.log (PID: $FRONTEND_PID)"
    echo "Waiting for services to initialize..."
    sleep 5
elif [ "$1" = "local-stop" ]; then
    echo "Stopping local services..."
    if [ -f ".backend.pid" ]; then
        kill $(cat .backend.pid) && rm .backend.pid
        echo "Backend stopped."
    fi
    if [ -f ".frontend.pid" ]; then
        kill $(cat .frontend.pid) && rm .frontend.pid
        echo "Frontend stopped."
    fi
    # Fallback cleanup
    pkill -f "uvicorn app.main:app"
    pkill -f "vite"
    echo "Cleanup complete."
elif [ "$1" = "logs" ]; then
    docker compose logs -f
elif [ "$1" = "test" ]; then
    echo "Running CLI automated API tests..."
    export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin
    pip3 install -q requests colorama
    python3 scripts/test_api.py all
else
    echo "Usage: ./run_system.sh [start | stop | local-start | local-stop | logs | test]"
    echo ""
    echo "  start       : Starts Docker containers"
    echo "  stop        : Stops Docker containers"
    echo "  local-start : Starts services locally (Non-Docker)"
    echo "  local-stop  : Stops local services"
    echo "  logs        : Follows logs from Docker"
    echo "  test        : Runs the Python CLI API tester"
fi
