#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🛑 Stopping all Schedula services..."
echo ""

# Stop frontend
echo "Stopping frontend..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓${NC} Frontend stopped"
else
    echo -e "   ${YELLOW}⚠${NC} Frontend was not running"
fi

# Stop backend
echo "Stopping backend..."
lsof -ti:7071 | xargs kill -9 2>/dev/null
pkill -f "func start" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "   ${GREEN}✓${NC} Backend stopped"
else
    echo -e "   ${YELLOW}⚠${NC} Backend was not running"
fi

# Optionally stop SQL Server (commented out by default)
# Uncomment the lines below if you want to stop SQL Server too
# echo "Stopping SQL Server..."
# docker stop schedula-sql 2>/dev/null
# if [ $? -eq 0 ]; then
#     echo -e "   ${GREEN}✓${NC} SQL Server stopped"
# else
#     echo -e "   ${YELLOW}⚠${NC} SQL Server was not running"
# fi

echo ""
echo -e "${GREEN}✅ All services stopped!${NC}"
echo ""
echo "Note: SQL Server container is still running."
echo "To stop it: docker stop schedula-sql"
echo "To remove it: docker rm schedula-sql"
