#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting Schedula Application..."
echo ""

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to wait for a service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    echo -n "Waiting for $name"
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗${NC}"
    return 1
}

# Step 1: Check/Start SQL Server
echo "📦 Step 1: Checking SQL Server..."
if docker ps | grep -q schedula-sql; then
    echo -e "   ${GREEN}✓${NC} SQL Server already running"
else
    echo "   Starting SQL Server container..."
    docker run -d --name schedula-sql \
      -e "ACCEPT_EULA=Y" \
      -e "MSSQL_SA_PASSWORD=YourPassword123!" \
      -e "MSSQL_PID=Developer" \
      -p 1433:1433 \
      mcr.microsoft.com/azure-sql-edge:latest > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✓${NC} SQL Server container started"
        echo "   Waiting 30 seconds for SQL Server to initialize..."
        sleep 30
    else
        echo -e "   ${RED}✗${NC} Failed to start SQL Server"
        echo "   Make sure Docker Desktop is running!"
        exit 1
    fi
fi

# Step 2: Check/Create database
echo ""
echo "🗄️  Step 2: Setting up database..."
if [ -f "setup-database.js" ]; then
    # Try to create database (will skip if exists)
    node setup-database.js 2>&1 | grep -E "(created|exists|Success|Error)" | head -3
    echo -e "   ${GREEN}✓${NC} Database check completed"
else
    echo -e "   ${YELLOW}⚠${NC} setup-database.js not found, skipping"
fi

# Step 3: Build backend
echo ""
echo "🔨 Step 3: Building backend..."
if npm run build > /tmp/schedula-build.log 2>&1; then
    echo -e "   ${GREEN}✓${NC} Backend built successfully"
else
    echo -e "   ${RED}✗${NC} Build failed. Check /tmp/schedula-build.log"
    exit 1
fi

# Step 4: Start backend
echo ""
echo "⚙️  Step 4: Starting backend (Azure Functions)..."
if check_port 7071; then
    echo -e "   ${YELLOW}⚠${NC} Port 7071 already in use, killing existing process..."
    lsof -ti:7071 | xargs kill -9 2>/dev/null
    sleep 2
fi

cd "$PROJECT_DIR"
func start > /tmp/func-server.log 2>&1 &
BACKEND_PID=$!
echo "   Backend starting (PID: $BACKEND_PID)"
sleep 8

if wait_for_service "http://localhost:7071/api/health" "Backend"; then
    echo -e "   ${GREEN}✓${NC} Backend is running at http://localhost:7071"
else
    echo -e "   ${RED}✗${NC} Backend failed to start. Check /tmp/func-server.log"
    exit 1
fi

# Step 5: Start frontend
echo ""
echo "🎨 Step 5: Starting frontend (Next.js)..."
if check_port 3000; then
    echo -e "   ${YELLOW}⚠${NC} Port 3000 already in use, killing existing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

cd "$PROJECT_DIR/frontend"
npm run dev > /tmp/next-server.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend starting (PID: $FRONTEND_PID)"
sleep 6

if wait_for_service "http://localhost:3000" "Frontend"; then
    echo -e "   ${GREEN}✓${NC} Frontend is running at http://localhost:3000"
else
    echo -e "   ${YELLOW}⚠${NC} Frontend may still be starting. Check /tmp/next-server.log"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All services started!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Frontend:  http://localhost:3000"
echo "📍 Backend:   http://localhost:7071/api"
echo "📍 Health:    http://localhost:7071/api/health"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/func-server.log"
echo "   Frontend: tail -f /tmp/next-server.log"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop-all.sh"
echo ""
echo "Press Ctrl+C to stop this script (services will keep running)"
echo ""

# Keep script running and show status
while true; do
    sleep 10
    BACKEND_UP=$(curl -s http://localhost:7071/api/health > /dev/null 2>&1 && echo "✓" || echo "✗")
    FRONTEND_UP=$(curl -s http://localhost:3000 > /dev/null 2>&1 && echo "✓" || echo "✗")
    SQL_UP=$(docker ps | grep -q schedula-sql && echo "✓" || echo "✗")
    
    echo -e "[$(date +%H:%M:%S)] Backend: ${BACKEND_UP} | Frontend: ${FRONTEND_UP} | SQL: ${SQL_UP}"
done
