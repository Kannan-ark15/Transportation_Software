-- Add is_admin column to login_users table
ALTER TABLE IF EXISTS login_users
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;
