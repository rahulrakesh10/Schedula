# Step-by-Step Guide: Running SQL Server for Schedula

## Prerequisites

### Step 1: Install Docker Desktop

**Option A: Using Homebrew (Recommended)**
```bash
brew install --cask docker
```

**Option B: Manual Download**
1. Go to https://www.docker.com/products/docker-desktop/
2. Download Docker Desktop for Mac
3. Install the .dmg file
4. Open Docker Desktop from Applications

**After Installation:**
- Open Docker Desktop application
- Wait for it to start (whale icon in menu bar should be steady)
- Verify: Run `docker --version` in terminal

---

## Step 2: Start SQL Server Container

1. **Open Terminal** and navigate to your project:
   ```bash
   cd /Users/rahulrakesh/Schedula
   ```

2. **Start SQL Server** using Docker Compose:
   ```bash
   docker-compose up -d sqlserver
   ```

3. **Wait for SQL Server to be ready** (about 30-60 seconds):
   ```bash
   docker-compose ps
   ```
   You should see the container status as "healthy"

4. **Verify SQL Server is running**:
   ```bash
   docker ps | grep sqlserver
   ```
   You should see a container named `schedula-sql` running

---

## Step 3: Create the Database

You have two options:

### Option A: Using Azure Data Studio (Easiest - GUI)

1. **Install Azure Data Studio** (if not installed):
   ```bash
   brew install --cask azure-data-studio
   ```

2. **Connect to SQL Server**:
   - Open Azure Data Studio
   - Click "New Connection"
   - Server: `localhost,1433`
   - Authentication: SQL Login
   - Username: `sa`
   - Password: `YourPassword123!`
   - Click "Connect"

3. **Create Database**:
   - Right-click on "Databases" → "New Database"
   - Database name: `schedula`
   - Click "OK"

4. **Run Schema**:
   - Right-click on `schedula` database → "New Query"
   - Open file: `src/database/schema.sql`
   - Copy all contents and paste into query window
   - Click "Run" (or press F5)

### Option B: Using sqlcmd (Command Line)

1. **Install SQL Server command-line tools**:
   ```bash
   brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
   brew update
   brew install mssql-tools
   ```

2. **Create database and run schema**:
   ```bash
   # Create database
   sqlcmd -S localhost,1433 -U sa -P YourPassword123! -Q "CREATE DATABASE schedula"
   
   # Run schema
   sqlcmd -S localhost,1433 -U sa -P YourPassword123! -d schedula -i src/database/schema.sql
   ```

---

## Step 4: Verify Everything Works

1. **Check database connection**:
   ```bash
   curl http://localhost:7071/api/health
   ```
   Should return: `"database": "up"`

2. **Test the API**:
   ```bash
   curl http://localhost:7071/api/public-services?page=1&limit=5
   ```
   Should return services (or empty array if no services yet)

---

## Step 5: Add Some Test Data (Optional)

You can add test services through the admin dashboard:
1. Go to http://localhost:3000
2. Click "Register" to create an admin account
3. Login and go to Dashboard
4. Create some services

Or use SQL directly:
```sql
-- Connect to database and run:
INSERT INTO Services (Name, Description, DurationMinutes, Price, IsActive)
VALUES 
  ('Haircut', 'Professional haircut service', 30, 25.00, 1),
  ('Hair Color', 'Full hair coloring service', 120, 85.00, 1),
  ('Manicure', 'Nail care and polish', 45, 35.00, 1);
```

---

## Troubleshooting

### SQL Server won't start
```bash
# Check logs
docker-compose logs sqlserver

# Restart container
docker-compose restart sqlserver
```

### Can't connect to database
- Verify Docker is running: `docker ps`
- Check port 1433 is not in use: `lsof -i :1433`
- Try restarting: `docker-compose restart sqlserver`

### Database already exists error
```bash
# Drop and recreate
sqlcmd -S localhost,1433 -U sa -P YourPassword123! -Q "DROP DATABASE schedula"
sqlcmd -S localhost,1433 -U sa -P YourPassword123! -Q "CREATE DATABASE schedula"
```

---

## Stop SQL Server (when done)

```bash
docker-compose stop sqlserver
```

## Remove SQL Server (clean up)

```bash
docker-compose down -v
```
