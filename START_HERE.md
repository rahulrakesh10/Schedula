# 🚀 Complete Setup Guide - Start Here

Follow these steps in order:

---

## Step 1: Start Docker Desktop

1. **Open Docker Desktop** from Applications
   - If not installed: Download from https://www.docker.com/products/docker-desktop/
   - Wait for the Docker icon in menu bar to be **steady** (not animated)
   - This means Docker is ready

**Verify Docker is running:**
```bash
docker ps
```
Should show empty list (no error) = Docker is running ✅

---

## Step 2: Start SQL Server

Open Terminal and run:

```bash
cd /Users/rahulrakesh/Schedula
docker run -d --name schedula-sql \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourPassword123!" \
  -e "MSSQL_PID=Developer" \
  -p 1433:1433 \
  mcr.microsoft.com/azure-sql-edge:latest
```

**Wait 30-60 seconds**, then verify:

```bash
docker ps
```

You should see `schedula-sql` container running ✅

---

## Step 3: Create Database

### Option A: Using Azure Data Studio (Easiest)

1. **Install Azure Data Studio:**
   ```bash
   brew install --cask azure-data-studio
   ```

2. **Open Azure Data Studio** and connect:
   - Click "New Connection"
   - **Server:** `localhost,1433`
   - **Authentication:** SQL Login
   - **Username:** `sa`
   - **Password:** `YourPassword123!`
   - Click "Connect"

3. **Create Database:**
   - Right-click "Databases" → "New Database"
   - **Name:** `schedula`
   - Click "OK"

4. **Run Schema:**
   - Right-click `schedula` database → "New Query"
   - Open file: `/Users/rahulrakesh/Schedula/src/database/schema.sql`
   - Copy ALL the SQL code
   - Paste into query window
   - Press **F5** or click "Run"

### Option B: Command Line

```bash
# Install sqlcmd
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew install mssql-tools

# Create database
sqlcmd -S localhost,1433 -U sa -P YourPassword123! -Q "CREATE DATABASE schedula"

# Run schema
sqlcmd -S localhost,1433 -U sa -P YourPassword123! -d schedula -i src/database/schema.sql
```

---

## Step 4: Verify Everything Works

```bash
# Check database connection
curl http://localhost:7071/api/health
```

Should show: `"database": "up"` ✅

---

## Step 5: Test the App

1. **Open browser:** http://localhost:3000
2. You should see services and the calendar working!

---

## Quick Commands Reference

```bash
# Check SQL Server is running
docker ps | grep schedula-sql

# View SQL Server logs
docker logs schedula-sql

# Stop SQL Server
docker stop schedula-sql

# Start SQL Server (if stopped)
docker start schedula-sql

# Remove SQL Server container
docker rm schedula-sql
```

---

## Troubleshooting

**Docker not running?**
- Open Docker Desktop app
- Wait for menu bar icon to be steady

**Can't connect to database?**
- Check SQL Server is running: `docker ps`
- Check logs: `docker logs schedula-sql`
- Restart: `docker restart schedula-sql`

**Database already exists?**
- In Azure Data Studio: Right-click `schedula` → "Delete"
- Or via command: `sqlcmd -S localhost,1433 -U sa -P YourPassword123! -Q "DROP DATABASE schedula"`
