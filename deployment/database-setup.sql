-- ============================================================================
-- Pasir Finance Database Setup
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing tables if they exist (CAREFUL: This deletes all data!)
-- Uncomment these lines only if you want to start fresh
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS incomes CASCADE;
-- DROP TABLE IF EXISTS expenses CASCADE;
-- DROP TABLE IF EXISTS loans CASCADE;

-- ============================================================================
-- Create Tables
-- ============================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incomes Table
CREATE TABLE IF NOT EXISTS incomes (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Create Default Admin User
-- ============================================================================

-- Password: admin123
-- (Change this in production!)
INSERT INTO users (username, password_hash) VALUES 
('admin', '$2b$10$rZ5kX7H8h9VkN3mYwQx/VuKFZGPZV8yLx7xqYx7VkN3mYwQx/VuKF')
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- Verify Tables Created
-- ============================================================================

-- Check if tables exist (optional)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if admin user was created (optional)
SELECT id, username, created_at 
FROM users 
WHERE username = 'admin';

-- ============================================================================
-- Success!
-- ============================================================================

-- If you see no errors, your database is ready! ✅

