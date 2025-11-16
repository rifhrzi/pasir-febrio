-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incomes
CREATE TABLE IF NOT EXISTS incomes (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
