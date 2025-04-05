#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Customer 360 Agentic Dashboard Startup Script${NC}"
echo "========================================"

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed. Please install Python 3 and try again.${NC}"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment. Please check your Python installation.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Virtual environment already exists.${NC}"
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install requirements if not already installed
echo -e "${YELLOW}Installing requirements...${NC}"
pip install -r requirements.txt

# Ensure database is set up
echo -e "${YELLOW}Ensuring database is set up...${NC}"
python database/setup_db.py

# Start Flask server in development mode for better error messages
echo -e "${GREEN}Starting Flask server in development mode...${NC}"
export FLASK_APP=web_dashboard/app.py
export FLASK_ENV=development
export FLASK_DEBUG=1

# Start Flask server in the background
python -m flask run --host=0.0.0.0 &
FLASK_PID=$!

# Wait for Flask to start
echo -e "${YELLOW}Waiting for Flask server to start...${NC}"
sleep 2

# Open the app in the default browser
echo -e "${GREEN}Opening dashboard in your web browser...${NC}"
python -m webbrowser http://127.0.0.1:5000/

echo -e "${GREEN}App is running!${NC}"
echo "Press Ctrl+C to stop the server"

# Trap Ctrl+C and kill the Flask process
trap "kill $FLASK_PID; echo -e '${YELLOW}Shutting down server...${NC}'; exit 0" INT

# Keep the script running until Ctrl+C is pressed
wait $FLASK_PID