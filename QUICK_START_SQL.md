# Quick Start: SQL Server Setup

## Step 1: Install Docker Desktop

**You need to do this manually:**

1. Open Terminal and run:
   ```bash
   brew install --cask docker
   ```
   (Enter your Mac password when prompted)

2. **OR** download manually:
   - Visit: https://www.docker.com/products/docker-desktop/
   - Download Docker Desktop for Mac
   - Install the .dmg file
   - Open Docker Desktop from Applications

3. **Start Docker Desktop**:
   - Open Applications → Docker
   - Wait for the whale icon in menu bar to be steady (not animated)
   - This means Docker is running

---

## Step 2: Start SQL Server

Once Docker is running, open Terminal and run:

```bash
cd /Users/rahulrakesh/Schedula
docker-compose up -d sqlserver
```

Wait about 30-60 seconds for SQL Server to start.

**Verify it's running:**
```bash
docker ps
```
You should see `schedula-sql` container running.

---

## Step 3: Create Database & Run Schema

### Easy Way: Use Azure Data Studio

1. **Install Azure Data Studio:**
   ```bash
   brew install --cask azure-data-studio
   ```

2. **Connect:**
   - Server: `localhost,1433`
   - Username: `sa`
   - Password: `YourPassword123!`

3. **Create Database:**
   - Right-click "Databases" → "New Database"
   - Name: `schedula`
   - Click OK

4. **Run Schema:**
   - Right-click `schedula` database → "New Query"
   - Open `src/database/schema.sql`
   - Copy all SQL and paste into query window
   - Press F5 to run

### Command Line Way:

```bash
# Install sqlcmd tools
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew install mssql-tools

# Create database
sqlcmd -S localhost,1433 -U sa -P YourPassword123! -Q "CREATE DATABASE schedula"

# Run schema
sqlcmd -S localhost,1433 -U sa -P YourPassword123! -d schedula -i src/database/schema.sql
```

---

## Step 4: Verify It Works

```bash
# Check health endpoint
curl http://localhost:7071/api/health
```

Should show: `"database": "up"`

---

## That's It! 🎉

Your app should now work with real data. Refresh http://localhost:3000

---

## Need Help?

- Check SQL Server logs: `docker-compose logs sqlserver`
- Restart SQL Server: `docker-compose restart sqlserver`
- Stop SQL Server: `docker-compose stop sqlserver`
