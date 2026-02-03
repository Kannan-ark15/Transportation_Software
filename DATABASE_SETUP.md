# PostgreSQL Database Setup for Transport System

## Method 1: Using pgAdmin (Easiest - Recommended)

### Step 1: Open pgAdmin
1. Open **pgAdmin** from Start Menu
2. Enter your master password if prompted
3. Expand **Servers** → **PostgreSQL** (your version)
4. Enter your PostgreSQL password

### Step 2: Create Database
1. Right-click on **Databases**
2. Select **Create** → **Database...**
3. In the "Database" field, type: `transport_db`
4. Click **Save**

### Step 3: Run the Schema
1. Right-click on the newly created **transport_db**
2. Select **Query Tool**
3. Click **Open File** (folder icon)
4. Navigate to: `D:\Transport\backend\config\database.sql`
5. Click **Open**
6. Click **Execute** (▶️ play button) or press **F5**
7. You should see: "Query returned successfully"

### Step 4: Verify Tables Created
1. In pgAdmin, expand: **transport_db** → **Schemas** → **public** → **Tables**
2. You should see: **companies** table
3. Right-click on **companies** → **View/Edit Data** → **All Rows**
4. Should show empty table with all columns

---

## Method 2: Using SQL Shell (psql)

### Step 1: Open SQL Shell
1. Search for **SQL Shell (psql)** in Start Menu
2. Open it

### Step 2: Connect to PostgreSQL
Press **Enter** for each prompt to use defaults:
```
Server [localhost]: [Press Enter]
Database [postgres]: [Press Enter]
Port [5432]: [Press Enter]
Username [postgres]: [Press Enter]
Password for user postgres: [Type your password and press Enter]
```

### Step 3: Create Database and Run Schema
```sql
-- Create the database
CREATE DATABASE transport_db;

-- Connect to the new database
\c transport_db

-- Run the schema file
\i 'D:/Transport/backend/config/database.sql'

-- Verify table was created
\dt

-- View table structure
\d companies

-- Exit
\q
```

---

## Method 3: Using Command Line (if psql is in PATH)

Open **Command Prompt** or **PowerShell**:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE transport_db;"

# Run schema
psql -U postgres -d transport_db -f "D:\Transport\backend\config\database.sql"

# Verify
psql -U postgres -d transport_db -c "\dt"
```

---

## Verification

After running the schema, you should have:

✅ Database: `transport_db`  
✅ Table: `companies`  
✅ Columns: id, company_name, company_address_1, company_address_2, place, gst_no, pin_code, contact_no, email_id, created_at, updated_at  
✅ Indexes: 3 indexes created  
✅ Trigger: Auto-update trigger for updated_at  

---

## Next Steps

After database is set up:

1. **Configure backend** (if not done):
   ```bash
   cd D:\Transport\backend
   copy .env.example .env
   ```
   
   Edit `.env` and set your PostgreSQL password:
   ```env
   DB_PASSWORD=your_actual_password
   ```

2. **Install dependencies** (fix PowerShell first):
   ```bash
   cd D:\Transport
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Start the application**:
   ```bash
   cd D:\Transport
   npm run dev
   ```

---

## Troubleshooting

**Error: "database already exists"**
- Database was already created, skip to Step 3 (Run Schema)

**Error: "permission denied"**
- Make sure you're logged in as postgres user
- Check your PostgreSQL password

**Error: "relation already exists"**
- Tables already created, you're good to go!
- Or drop and recreate: `DROP TABLE companies CASCADE;` then run schema again
