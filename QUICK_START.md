# 🚀 Quick Start Guide

## Start Everything

```bash
./start-all.sh
```

**OR**

```bash
npm run dev
```

This single command will:
- ✅ Start SQL Server (if not running)
- ✅ Create database (if needed)
- ✅ Build backend
- ✅ Start backend on port 7071
- ✅ Start frontend on port 3000
- ✅ Show live status

## Stop Everything

```bash
./stop-all.sh
```

**OR**

```bash
npm run stop
```

## Access Your App

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:7071/api
- **Health Check:** http://localhost:7071/api/health

## What You'll See

1. **Visual Calendar** - Interactive week view with available slots
2. **Service Cards** - Beautiful card-based service selection
3. **Real-time Availability** - Live slot checking
4. **Modern UI** - Polished design with animations

## Troubleshooting

**Port already in use?**
- The script will automatically kill existing processes

**SQL Server not starting?**
- Make sure Docker Desktop is running
- Check: `docker ps`

**Database errors?**
- Make sure SQL Server container is running: `docker ps`
- Check SQL Server logs: `docker logs schedula-sql`

**View logs:**
- Backend: `tail -f /tmp/func-server.log`
- Frontend: `tail -f /tmp/next-server.log`
