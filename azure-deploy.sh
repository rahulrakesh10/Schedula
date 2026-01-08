#!/bin/bash

# Azure Deployment Script for Schedula
# This script helps deploy the Azure Functions app to Azure

set -e

echo "🚀 Starting Schedula deployment to Azure..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "⚠️  Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Configuration
RESOURCE_GROUP=${RESOURCE_GROUP:-"schedula-rg"}
LOCATION=${LOCATION:-"eastus"}
FUNCTION_APP_NAME=${FUNCTION_APP_NAME:-"schedula-$(date +%s)"}
STORAGE_ACCOUNT_NAME=${STORAGE_ACCOUNT_NAME:-"schedulastorage$(date +%s | cut -c 1-10)"}
APP_SERVICE_PLAN=${APP_SERVICE_PLAN:-"schedula-plan"}
SQL_SERVER_NAME=${SQL_SERVER_NAME:-"schedula-sql-$(date +%s)"}
SQL_DB_NAME=${SQL_DB_NAME:-"schedula"}
KEY_VAULT_NAME=${KEY_VAULT_NAME:-"schedula-kv-$(date +%s)"}

echo "📋 Deployment Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Location: $LOCATION"
echo "   Function App: $FUNCTION_APP_NAME"
echo "   Storage Account: $STORAGE_ACCOUNT_NAME"
echo "   SQL Server: $SQL_SERVER_NAME"
echo "   SQL Database: $SQL_DB_NAME"
echo "   Key Vault: $KEY_VAULT_NAME"
echo ""

# Build the project
echo "🔨 Building the project..."
npm run build

# Create resource group
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
echo "💾 Creating storage account..."
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_LRS

# Create App Service Plan (Consumption plan for serverless)
echo "📋 Creating App Service Plan..."
az functionapp plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Y1

# Create Function App
echo "⚡ Creating Function App..."
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --storage-account $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4

# Create Key Vault
echo "🔐 Creating Key Vault..."
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Grant Function App access to Key Vault
echo "🔑 Configuring Key Vault access..."
FUNCTION_APP_PRINCIPAL_ID=$(az functionapp identity assign \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $FUNCTION_APP_PRINCIPAL_ID \
  --secret-permissions get list

# Create SQL Server and Database
echo "🗄️  Creating SQL Server..."
SQL_ADMIN_PASSWORD=$(openssl rand -base64 32)
az sql server create \
  --name $SQL_SERVER_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user sqladmin \
  --admin-password $SQL_ADMIN_PASSWORD

echo "💾 Creating SQL Database..."
az sql db create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER_NAME \
  --name $SQL_DB_NAME \
  --service-objective Basic

# Configure firewall (allow Azure services)
echo "🔥 Configuring SQL firewall..."
az sql server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --server $SQL_SERVER_NAME \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Store SQL connection string in Key Vault
echo "🔐 Storing SQL connection string in Key Vault..."
SQL_CONNECTION_STRING="Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;Initial Catalog=${SQL_DB_NAME};Persist Security Info=False;User ID=sqladmin;Password=${SQL_ADMIN_PASSWORD};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name SQL-CONNECTION-STRING \
  --value "$SQL_CONNECTION_STRING"

# Store JWT secret in Key Vault
echo "🔐 Storing JWT secret in Key Vault..."
JWT_SECRET=$(openssl rand -base64 64)
az keyvault secret set \
  --vault-name $KEY_VAULT_NAME \
  --name JWT-SECRET \
  --value "$JWT_SECRET"

# Configure Function App settings
echo "⚙️  Configuring Function App settings..."
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    KEY_VAULT_URI="https://${KEY_VAULT_NAME}.vault.azure.net/" \
    JWT_EXPIRES_IN="24h" \
    ENVIRONMENT="production" \
    FUNCTIONS_WORKER_RUNTIME="node"

# Deploy Function App
echo "🚀 Deploying Function App..."
cd dist
func azure functionapp publish $FUNCTION_APP_NAME
cd ..

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run the database schema: az sql db execute --resource-group $RESOURCE_GROUP --server $SQL_SERVER_NAME --database $SQL_DB_NAME --file-path src/database/schema.sql"
echo "   2. Test the health endpoint: https://${FUNCTION_APP_NAME}.azurewebsites.net/api/health"
echo "   3. Function App URL: https://${FUNCTION_APP_NAME}.azurewebsites.net"
echo ""
echo "🔐 Secrets stored in Key Vault: $KEY_VAULT_NAME"
echo "   SQL Admin Password: $SQL_ADMIN_PASSWORD (saved in Key Vault)"
echo ""
