# Local Setup and Testing Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js (v16+) installed
- ✅ PostgreSQL (v12+) installed and running
- ✅ Git installed

---

## Step 1: Install Dependencies

### Install all dependencies at once:
```bash
cd d:\Transport
npm install
cd backend
npm install
cd ../frontend
npm install
```

---

## Step 2: PostgreSQL Database Setup

### Option A: Using psql command line

1. **Open Command Prompt or PowerShell as Administrator**

2. **Create the database:**
```bash
psql -U postgres -c "CREATE DATABASE transport_db;"
```

3. **Run the schema:**
```bash
cd d:\Transport\backend
psql -U postgres -d transport_db -f config\database.sql
```

### Option B: Using pgAdmin (GUI)

1. Open pgAdmin
2. Right-click on "Databases" → Create → Database
3. Name it: `transport_db`
4. Open Query Tool
5. Copy and paste contents from `backend/config/database.sql`
6. Execute the query

---

## Step 3: Configure Environment Variables

### Backend Configuration

1. **Copy the example file:**
```bash
cd d:\Transport\backend
copy .env.example .env
```

2. **Edit `.env` file** with your PostgreSQL credentials:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transport_db
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
CORS_ORIGIN=http://localhost:5173
```

### Frontend Configuration (Optional)

```bash
cd d:\Transport\frontend
copy .env.example .env
```

The default API URL is already set correctly.

---

## Step 4: Start the Application

### Option A: Run Both Together (Recommended)

From the root directory:
```bash
cd d:\Transport
npm run dev
```

This will start both backend and frontend simultaneously.

### Option B: Run Separately

**Terminal 1 - Backend:**
```bash
cd d:\Transport\backend
npm run dev
```
Wait for: `✅ Database connected successfully` and `🚀 Server running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd d:\Transport\frontend
npm run dev
```
Wait for: `Local: http://localhost:5173/`

---

## Step 5: Test the Application

### 1. Open Browser
Navigate to: **http://localhost:5173**

### 2. Test Company Creation
- Click "Add New Company" button
- Fill in all required fields:
  - Company Name: `Test Transport Ltd`
  - Company Address 1: `123 Main Street, Building A`
  - Place: `Mumbai`
  - GST No: `27AABCU9603R1ZM`
  - PIN Code: `400001`
  - Contact No: `9876543210`
  - Email: `test@transport.com`
- Click "Create Company"
- Should see success message and redirect to list

### 3. Test Company List
- Should see the newly created company in the table
- Verify all fields are displayed correctly

### 4. Test Company Edit
- Click "Edit" button on a company
- Modify some fields
- Click "Update Company"
- Verify changes are saved

### 5. Test Company Delete
- Click "Delete" button on a company
- Confirm the deletion
- Verify company is removed from list

### 6. Test Validation
Try creating a company with:
- Invalid GST number (should show error)
- Invalid PIN code (should show error)
- Invalid contact number (should show error)
- Duplicate company name (should show error)

---

## Step 6: Verify Database

### Check data in PostgreSQL:

```bash
psql -U postgres -d transport_db
```

Then run:
```sql
-- View all companies
SELECT * FROM companies;

-- Count companies
SELECT COUNT(*) FROM companies;

-- Exit
\q
```

---

## Troubleshooting

### Issue: "Cannot connect to database"
**Solution:**
- Ensure PostgreSQL is running
- Check credentials in `backend/.env`
- Verify database `transport_db` exists

### Issue: "Port already in use"
**Solution:**
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.js`

### Issue: "CORS error"
**Solution:**
- Ensure `CORS_ORIGIN` in `backend/.env` is `http://localhost:5173`
- Restart backend server

### Issue: "Module not found"
**Solution:**
```bash
# Reinstall dependencies
cd d:\Transport
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Issue: "PowerShell script execution disabled"
**Solution:**
Run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## API Testing (Optional)

### Using Browser or Postman

**Health Check:**
```
GET http://localhost:5000/health
```

**Get All Companies:**
```
GET http://localhost:5000/api/companies
```

**Create Company:**
```
POST http://localhost:5000/api/companies
Content-Type: application/json

{
  "company_name": "ABC Transport",
  "company_address_1": "123 Street",
  "place": "Mumbai",
  "gst_no": "27AABCU9603R1ZM",
  "pin_code": "400001",
  "contact_no": "9876543210",
  "email_id": "abc@test.com"
}
```

---

## Success Indicators

✅ Backend console shows:
- `✅ Database connected successfully`
- `🚀 Server running on port 5000`

✅ Frontend console shows:
- `Local: http://localhost:5173/`
- No errors in browser console

✅ Application works:
- Can create companies
- Can view company list
- Can edit companies
- Can delete companies
- Validation works correctly

---

## Quick Commands Reference

```bash
# Install all dependencies
npm run install:all

# Run both (from root)
npm run dev

# Run backend only
cd backend && npm run dev

# Run frontend only
cd frontend && npm run dev

# Check database
psql -U postgres -d transport_db -c "SELECT * FROM companies;"
```
