# Schedula — Serverless Booking & Scheduling Backend

[![Azure Functions](https://img.shields.io/badge/Azure-Functions-0062AD?logo=azure-functions)](https://azure.microsoft.com/services/functions/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Azure SQL](https://img.shields.io/badge/Azure-SQL_Database-0078D4?logo=microsoft-azure)](https://azure.microsoft.com/services/sql-database/)

**Schedula** is a production-ready, serverless backend API designed to handle appointment booking and client management for small businesses and freelancers. Built on Microsoft Azure with automatic scaling, secure authentication, and conflict-free scheduling.

## 🎯 Features

### 🔐 Authentication & Authorization
- User registration and login with hashed passwords
- JWT-based authentication
- Role-based access control (Admin, Client)
- Secure token management

### 📅 Booking & Scheduling
- Create, view, and cancel bookings
- **Conflict-free scheduling** with transactional database checks
- Enforces service duration and availability rules
- Booking status tracking (Confirmed, Cancelled, Completed)

### 🗄️ Data Management
- Normalized relational database schema
- Referential integrity with foreign keys
- Indexed time-based queries for efficient conflict detection
- Service management (Admin only)

### ☁️ Cloud-Native Architecture
- **Fully serverless** using Azure Functions
- Automatic scaling with no server provisioning
- Secure secrets management via Azure Key Vault
- Centralized logging and monitoring with Application Insights

### 🧪 Reliability & Validation
- Input validation using Zod schemas
- Centralized error handling
- Health-check endpoint for monitoring
- Transactional booking creation

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** 9.x or higher
- **Azure Functions Core Tools** v4.x
  ```bash
  npm install -g azure-functions-core-tools@4 --unsafe-perm true
  ```
- **Azure CLI** (for deployment)
- **Azure SQL Database** or **SQL Server** (local or Azure)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd Schedula
npm install
```

### 2. Configure Environment

Copy the example settings file:

```bash
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json` with your configuration:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FUNCTIONS_EXTENSION_VERSION": "~4",
    "SQL_CONNECTION_STRING": "Server=tcp:localhost,1433;Database=schedula;User ID=sa;Password=YourPassword123!;Encrypt=true;TrustServerCertificate=true;",
    "JWT_SECRET": "your-super-secret-jwt-key-change-in-production",
    "JWT_EXPIRES_IN": "24h",
    "ENVIRONMENT": "local"
  }
}
```

### 3. Set Up Database

#### Option A: Using Docker (Recommended for Local Development)

```bash
# Start SQL Server container
docker-compose up -d sqlserver

# Wait for SQL Server to be ready (about 30 seconds)
# Then run the schema
# You can use Azure Data Studio, sqlcmd, or any SQL client
```

Connect to SQL Server:
- Server: `localhost,1433`
- Username: `sa`
- Password: `YourPassword123!`
- Database: Create a new database named `schedula`

Then run the schema file:

```bash
# Using sqlcmd (install SQL Server command-line tools)
sqlcmd -S localhost,1433 -U sa -P YourPassword123! -i src/database/schema.sql -d schedula
```

#### Option B: Azure SQL Database

1. Create an Azure SQL Database in the Azure Portal
2. Update `SQL_CONNECTION_STRING` in `local.settings.json`
3. Run the schema using Azure Data Studio or SQL Server Management Studio

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Start Azure Functions locally
npm start
```

The API will be available at `http://localhost:7071`

### 5. Test the API

#### Health Check

```bash
curl http://localhost:7071/api/health
```

#### Register a User

```bash
curl -X POST http://localhost:7071/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "fullName": "Admin User",
    "role": "Admin"
  }'
```

#### Login

```bash
curl -X POST http://localhost:7071/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

Save the `token` from the response for authenticated requests.

## 📚 API Documentation

### Authentication Endpoints

#### `POST /api/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "role": "Client"  // or "Admin"
}
```

**Response:** Returns user object and JWT token.

---

#### `POST /api/login`
Login and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** Returns user object and JWT token.

---

### Service Endpoints (Admin Only)

#### `POST /api/createService`
Create a new service (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Haircut",
  "description": "Professional haircut service",
  "durationMinutes": 30,
  "price": 25.00,
  "isActive": true
}
```

---

#### `GET /api/listServices?isActive=true`
List all services (optional filter by active status).

**Headers:** `Authorization: Bearer <token>`

---

#### `GET /api/getService/{id}`
Get a specific service by ID.

**Headers:** `Authorization: Bearer <token>`

---

#### `PUT /api/updateService/{id}`
Update a service (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:** (partial updates allowed)
```json
{
  "name": "Updated Service Name",
  "price": 30.00
}
```

---

#### `DELETE /api/deleteService/{id}`
Delete a service (Admin only). Cannot delete services with active bookings.

**Headers:** `Authorization: Bearer <token>`

---

### Booking Endpoints

#### `POST /api/createBooking`
Create a new booking with conflict detection.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "serviceId": "uuid-here",
  "startTime": "2024-01-15T10:00:00Z",
  "notes": "Optional booking notes"
}
```

**Response:** Returns booking object with calculated end time.

**Error:** Returns 409 Conflict if booking overlaps with existing appointment.

---

#### `GET /api/listBookings?userId={id}&status={status}`
List bookings. Clients see only their own; Admins can filter by userId.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `userId` (optional, Admin only): Filter by user ID
- `status` (optional): Filter by status (Confirmed, Cancelled, Completed)

---

#### `GET /api/getBooking/{id}`
Get a specific booking by ID.

**Headers:** `Authorization: Bearer <token>`

**Note:** Clients can only access their own bookings.

---

#### `POST /api/cancelBooking/{id}`
Cancel a booking. Cannot cancel past or completed bookings.

**Headers:** `Authorization: Bearer <token>`

**Note:** Clients can only cancel their own bookings; Admins can cancel any.

---

### Health Endpoint

#### `GET /api/health`
Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "services": {
    "database": "up"
  }
}
```

## 🏗️ Project Structure

```
Schedula/
├── src/
│   ├── config/           # Configuration management
│   │   └── config.ts
│   ├── database/         # Database utilities and schema
│   │   ├── db.ts
│   │   └── schema.sql
│   ├── functions/        # Azure Functions
│   │   ├── auth/         # Authentication functions
│   │   │   ├── register.ts
│   │   │   └── login.ts
│   │   ├── services/     # Service management (Admin)
│   │   │   ├── createService.ts
│   │   │   ├── listServices.ts
│   │   │   ├── getService.ts
│   │   │   ├── updateService.ts
│   │   │   └── deleteService.ts
│   │   ├── bookings/     # Booking functions
│   │   │   ├── createBooking.ts
│   │   │   ├── listBookings.ts
│   │   │   ├── getBooking.ts
│   │   │   └── cancelBooking.ts
│   │   └── health/       # Health check
│   │       └── healthCheck.ts
│   ├── middleware/       # Authentication middleware
│   │   └── auth.ts
│   ├── telemetry/        # Application Insights
│   │   └── appinsights.ts
│   ├── utils/            # Utilities
│   │   ├── auth.ts       # JWT and password hashing
│   │   ├── errors.ts     # Error handling
│   │   └── validation.ts # Zod schemas
│   └── index.ts          # Main entry point
├── host.json             # Azure Functions host configuration
├── local.settings.json.example
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## 🔒 Security Features

1. **Password Hashing**: Uses bcrypt with salt rounds of 12
2. **JWT Tokens**: Secure token-based authentication
3. **Role-Based Access Control**: Enforced at middleware level
4. **SQL Injection Protection**: Parameterized queries
5. **Azure Key Vault**: Secure secrets management in production
6. **HTTPS Only**: Enforced in Azure Functions

## 🐳 Docker Development

Use Docker Compose for local development with SQL Server:

```bash
# Start SQL Server
docker-compose up -d sqlserver

# After SQL Server is ready, run schema
# Then start Functions locally
npm run build && npm start
```

## ☁️ Azure Deployment

### Option 1: Using Deployment Script

```bash
chmod +x azure-deploy.sh
./azure-deploy.sh
```

### Option 2: Manual Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Create Azure resources** (Resource Group, Storage Account, Function App, SQL Database, Key Vault)

3. **Deploy using Azure Functions Core Tools:**
   ```bash
   cd dist
   func azure functionapp publish <function-app-name>
   ```

4. **Configure Application Settings** in Azure Portal:
   - `KEY_VAULT_URI`: Your Key Vault URI
   - `JWT_EXPIRES_IN`: Token expiration (e.g., "24h")
   - `ENVIRONMENT`: "production"

5. **Store secrets in Key Vault:**
   - `SQL-CONNECTION-STRING`: Your SQL connection string
   - `JWT-SECRET`: Strong random secret

6. **Run database schema** on Azure SQL Database

7. **Grant Function App managed identity** access to Key Vault

## 🧪 Testing

```bash
# Run linting
npm run lint

# Build
npm run build

# Test health endpoint
curl http://localhost:7071/api/health
```

## 📊 Monitoring

Application Insights is automatically configured when `APPLICATIONINSIGHTS_CONNECTION_STRING` is set. Monitor:

- Function execution times
- Error rates
- Custom events (user registration, booking creation, etc.)
- Dependencies (database queries)
- Exceptions

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SQL_CONNECTION_STRING` | Azure SQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `JWT_EXPIRES_IN` | Token expiration time | No (default: "24h") |
| `KEY_VAULT_URI` | Azure Key Vault URI | Production only |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string | No |
| `ENVIRONMENT` | Environment name (local/production) | Yes |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🎓 What This Project Demonstrates

- ✅ Serverless backend architecture on Azure
- ✅ Secure authentication and authorization
- ✅ Real-world business logic implementation
- ✅ Transactional conflict detection
- ✅ Cloud deployment and observability
- ✅ Production-level API structuring
- ✅ TypeScript best practices
- ✅ Database design and optimization

## 🆘 Troubleshooting

### Database Connection Issues

- Verify SQL Server is running
- Check connection string format
- Ensure firewall rules allow connections
- Verify credentials

### Authentication Errors

- Check JWT_SECRET is set correctly
- Verify token is included in Authorization header
- Check token expiration

### Booking Conflicts

- Ensure database indexes are created (from schema.sql)
- Check transaction isolation level
- Verify start time is in the future

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ using Azure Functions, TypeScript, and Azure SQL Database**
# Schedula


