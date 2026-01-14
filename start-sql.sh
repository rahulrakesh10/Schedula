#!/bin/bash
# Start SQL Server Container

docker run -d --name schedula-sql \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=YourPassword123!" \
  -e "MSSQL_PID=Developer" \
  -p 1433:1433 \
  mcr.microsoft.com/azure-sql-edge:latest

echo "SQL Server container starting..."
echo "Wait 30-60 seconds, then run: docker ps"
