# Transport System Management App

A complete **monorepo** boilerplate for a Transport System Management application with React frontend, Node.js/Express backend, and PostgreSQL database.

## 📋 Features

- **Company Master Management** with full CRUD operations
- Input validation (GST, PIN Code, Contact Number, Email)
- Uniqueness constraints enforcement
- Clean and responsive UI
- RESTful API architecture
- Centralized error handling

## 🏗️ Project Structure

```
Transport/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Validation utilities
│   │   ├── App.jsx        # Main app component
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── package.json
│   └── vite.config.js
│
├── backend/               # Node.js + Express backend
│   ├── config/           # Database configuration
│   ├── controllers/      # Request handlers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── middleware/       # Error handling
│   ├── utils/            # Validation utilities
│   ├── server.js         # Express server
│   └── package.json
│
└── package.json          # Root package.json
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd d:\Transport
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

   Or install individually:
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

### Database Setup

1. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE transport_db;
   ```

2. **Run the database schema:**
   ```bash
   cd backend
   psql -U postgres -d transport_db -f config/database.sql
   ```

3. **Configure environment variables:**
   ```bash
   cd backend
   copy .env.example .env
   ```

   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=transport_db
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   ```

### Running the Application

#### Option 1: Run Both (Recommended)
```bash
# From root directory
npm run dev
```

#### Option 2: Run Separately

**Backend:**
```bash
cd backend
npm run dev
```
Server runs on: `http://localhost:5000`

**Frontend:**
```bash
cd frontend
npm run dev
```
App runs on: `http://localhost:5173`

## 📚 API Endpoints

### Company Master

| Method | Endpoint              | Description           |
|--------|----------------------|----------------------|
| GET    | `/api/companies`     | Get all companies    |
| GET    | `/api/companies/:id` | Get company by ID    |
| POST   | `/api/companies`     | Create new company   |
| PUT    | `/api/companies/:id` | Update company       |
| DELETE | `/api/companies/:id` | Delete company       |

### Request Body Example (POST/PUT)

```json
{
  "company_name": "ABC Transport Ltd",
  "company_address_1": "123 Main Street, Building A",
  "company_address_2": "Near Central Station",
  "place": "Mumbai",
  "gst_no": "27AABCU9603R1ZM",
  "pin_code": "400001",
  "contact_no": "9876543210",
  "email_id": "contact@abctransport.com"
}
```

## ✅ Validation Rules

### Company Master Fields

| Field             | Type         | Validation                                    | Mandatory |
|-------------------|--------------|-----------------------------------------------|-----------|
| Company Name      | Text         | Min 2 chars, Unique                          | Yes       |
| Company Address 1 | Text Area    | Min 5 chars                                  | Yes       |
| Company Address 2 | Text Area    | —                                            | No        |
| Place             | Text         | Min 2 chars                                  | Yes       |
| GST No            | Alphanumeric | 15 chars format, Unique                      | Yes       |
| PIN Code          | Numeric      | 6 digits                                     | Yes       |
| Contact No        | Numeric      | 10 digits (starts with 6-9), Unique          | Yes       |
| Email ID          | Email        | Valid email format                           | Yes       |

### Validation Formats

- **GST Number:** `22AAAAA0000A1Z5` (2 digits + 10 alphanumeric + 1 alphabet + 1 digit + Z + 1 alphanumeric)
- **PIN Code:** `400001` (6 digits, first digit cannot be 0)
- **Contact Number:** `9876543210` (10 digits starting with 6-9)
- **Email:** Standard email format validation

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Vanilla CSS** - Styling

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **PostgreSQL** - Database
- **pg** - PostgreSQL client
- **express-validator** - Input validation
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

## 📁 Key Files

- **Backend:**
  - `backend/config/database.sql` - PostgreSQL schema
  - `backend/config/database.js` - Database connection
  - `backend/models/companyModel.js` - Company data model
  - `backend/controllers/companyController.js` - Business logic
  - `backend/routes/companyRoutes.js` - API routes
  - `backend/utils/validators.js` - Validation rules

- **Frontend:**
  - `frontend/src/components/CompanyForm.jsx` - Add/Edit form
  - `frontend/src/components/CompanyList.jsx` - Company listing
  - `frontend/src/services/api.js` - API integration
  - `frontend/src/utils/validation.js` - Client-side validation

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Hot module replacement enabled
```

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend (runs as-is, no build needed)
cd backend
npm start
```

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transport_db
DB_USER=postgres
DB_PASSWORD=your_password
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if database `transport_db` exists

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.js`

### CORS Errors
- Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL
- Default: `http://localhost:5173`

## 📄 License

ISC

## 👨‍💻 Author

Transport System Management Team

---

**Happy Coding! 🚀**
