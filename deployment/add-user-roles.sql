-- ============================================================================
-- Add Role-Based Access Control
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add role column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin';

-- Step 2: Update existing admin user to have admin role
UPDATE users SET role = 'admin' WHERE username = 'admin';

-- Step 3: Create viewer1 user (password: viewer123)
-- Hash generated with bcrypt 10 rounds
DELETE FROM users WHERE username = 'viewer1';
INSERT INTO users (username, password_hash, role) VALUES 
('viewer1', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'viewer');

-- Step 4: Create viewer2 user (password: viewer123)
DELETE FROM users WHERE username = 'viewer2';
INSERT INTO users (username, password_hash, role) VALUES 
('viewer2', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'viewer');

-- Verify users
SELECT id, username, role, created_at FROM users ORDER BY id;

-- ============================================================================
-- USER CREDENTIALS:
-- ============================================================================
-- 
-- ADMIN (Full Access):
--   Username: admin
--   Password: admin123
--   Role: admin
--   Permissions: View, Add, Edit, Delete
--
-- VIEWER 1 (View Only):
--   Username: viewer1
--   Password: viewer123
--   Role: viewer
--   Permissions: View only (cannot add/edit/delete)
--
-- VIEWER 2 (View Only):
--   Username: viewer2
--   Password: viewer123
--   Role: viewer
--   Permissions: View only (cannot add/edit/delete)
--
-- ============================================================================

