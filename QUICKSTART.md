# Quick Start Script for Transport System Management App

## IMPORTANT: PowerShell Execution Policy Issue Detected

You need to enable script execution in PowerShell first.

### Step 1: Fix PowerShell Execution Policy

**Open PowerShell as Administrator** and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Press `Y` when prompted.

---

## Step 2: Install Dependencies

After fixing the execution policy, run these commands:

### Option A: Install All at Once
```bash
cd d:\Transport
npm install
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### Option B: Use the monorepo install script
```bash
cd d:\Transport
npm run install:all
```

---

## Step 3: Set Up PostgreSQL Database

### Check if PostgreSQL is installed:

1. Open **Services** (Win + R, type `services.msc`)
2. Look for "postgresql" service
3. If found, ensure it's running

### Create Database:

**Option A: Using pgAdmin (Recommended for Windows)**
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click "Databases" → Create → Database
4. Name: `transport_db`
5. Click Save
6. Right-click on `transport_db` → Query Tool
7. Open file: `d:\Transport\backend\config\database.sql`
8. Execute (F5)

**Option B: Using Command Line** (if psql is in PATH)
```bash
# Create database
psql -U postgres -c "CREATE DATABASE transport_db;"

# Run schema
cd d:\Transport\backend
psql -U postgres -d transport_db -f config\database.sql
```

**Option C: Using SQL Shell (psql)**
1. Open "SQL Shell (psql)" from Start Menu
2. Press Enter for defaults (Server, Database, Port, Username)
3. Enter your PostgreSQL password
4. Run:
```sql
CREATE DATABASE transport_db;
\c transport_db
\i 'D:/Transport/backend/config/database.sql'
\q
```

---

## Step 4: Configure Backend Environment

```bash
cd d:\Transport\backend
copy .env.example .env
```

Then edit `backend\.env` with your PostgreSQL password:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=transport_db
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
CORS_ORIGIN=http://localhost:5173
```

---

## Step 5: Start the Application

### Option A: Run Both Together (After dependencies are installed)
```bash
cd d:\Transport
npm run dev
```

### Option B: Run Separately

**Terminal 1 - Backend:**
```bash
cd d:\Transport\backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd d:\Transport\frontend
npm run dev
```

---

## Step 6: Test the Application

1. Open browser: **http://localhost:5173**
2. Click "Add New Company"
3. Fill in the form with test data
4. Click "Create Company"
5. Verify the company appears in the list

---

## Troubleshooting

### "npm command not working"
- Restart PowerShell after changing execution policy
- Or use Command Prompt (cmd) instead of PowerShell

### "Cannot find PostgreSQL"
- Download from: https://www.postgresql.org/download/windows/
- Install with default settings
- Remember the password you set during installation

### "Database connection failed"
- Check PostgreSQL service is running
- Verify password in `backend\.env`
- Ensure database `transport_db` exists

---

## Expected Output

### Backend Console:
```
✅ Database connected successfully
🚀 Server running on port 5000
📍 Environment: development
🔗 API Base URL: http://localhost:5000/api
```

### Frontend Console:
```
VITE v5.0.8  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Quick Test Commands

After everything is running, test the API:

```bash
# Health check
curl http://localhost:5000/health

# Get companies (should return empty array initially)
curl http://localhost:5000/api/companies
```
