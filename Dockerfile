# Multi-stage build for Azure Functions
FROM mcr.microsoft.com/azure-functions/node:4-node20-appservice AS base

# Set working directory
WORKDIR /home/site/wwwroot

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY dist ./dist
COPY host.json ./
COPY .funcignore ./

# Final stage
FROM mcr.microsoft.com/azure-functions/node:4-node20-appservice

WORKDIR /home/site/wwwroot

# Copy from build stage
COPY --from=base /home/site/wwwroot ./

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true
