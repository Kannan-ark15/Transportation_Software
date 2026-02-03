# Transport System - Backend

Node.js/Express backend API for Transport System Management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   copy .env.example .env
   ```

   Edit `.env` with your database credentials.

3. **Create database and run schema:**
   ```bash
   # Create database
   psql -U postgres -c "CREATE DATABASE transport_db;"

   # Run schema
   psql -U postgres -d transport_db -f config/database.sql
   ```

4. **Start the server:**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

Server will run on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js       # PostgreSQL connection pool
│   └── database.sql      # Database schema
├── controllers/
│   └── companyController.js  # Company business logic
├── middleware/
│   └── errorHandler.js   # Centralized error handling
├── models/
│   └── companyModel.js   # Company data model
├── routes/
│   └── companyRoutes.js  # Company API routes
├── utils/
│   └── validators.js     # Validation utilities
├── .env.example          # Environment variables template
├── package.json
└── server.js             # Express app entry point
```

## 🔌 API Endpoints

### Health Check
```
GET /health
```

### Company Master

#### Get All Companies
```
GET /api/companies
```

#### Get Company by ID
```
GET /api/companies/:id
```

#### Create Company
```
POST /api/companies
Content-Type: application/json

{
  "company_name": "ABC Transport Ltd",
  "company_address_1": "123 Main Street",
  "company_address_2": "Near Station",
  "place": "Mumbai",
  "gst_no": "27AABCU9603R1ZM",
  "pin_code": "400001",
  "contact_no": "9876543210",
  "email_id": "contact@abc.com"
}
```

#### Update Company
```
PUT /api/companies/:id
Content-Type: application/json

{
  "company_name": "ABC Transport Ltd",
  ...
}
```

#### Delete Company
```
DELETE /api/companies/:id
```

## ✅ Validation Rules

### GST Number
- Format: `22AAAAA0000A1Z5`
- 15 characters
- Pattern: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric

### PIN Code
- 6 digits
- First digit cannot be 0
- Example: `400001`

### Contact Number
- 10 digits
- Must start with 6, 7, 8, or 9
- Example: `9876543210`

### Email
- Standard email format
- Example: `user@example.com`

### Uniqueness Constraints
- Company Name (unique)
- GST Number (unique)
- Contact Number (unique)

## 🗄️ Database Schema

```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    company_address_1 TEXT NOT NULL,
    company_address_2 TEXT,
    place VARCHAR(255) NOT NULL,
    gst_no VARCHAR(15) NOT NULL UNIQUE,
    pin_code VARCHAR(6) NOT NULL,
    contact_no VARCHAR(15) NOT NULL UNIQUE,
    email_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## ⚙️ Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transport_db
DB_USER=postgres
DB_PASSWORD=your_password

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🛠️ Development

### Run with auto-reload
```bash
npm run dev
```

### Run in production
```bash
npm start
```

## 📦 Dependencies

- **express** - Web framework
- **pg** - PostgreSQL client
- **dotenv** - Environment variables
- **cors** - CORS middleware
- **express-validator** - Input validation

## 🐛 Error Handling

The API uses centralized error handling with appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

Error Response Format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "field_name",
      "message": "Error message"
    }
  ]
}
```

## 📝 Notes

- All timestamps are automatically managed by PostgreSQL triggers
- Database connection uses connection pooling for better performance
- Input validation happens at both route level and controller level
- CORS is configured to allow requests from the frontend
