#!/bin/bash

################################################################################
# PostgreSQL Database Setup Script
# For Pasir Finance Application
################################################################################

set -e

echo "=================================="
echo "PostgreSQL Database Setup"
echo "=================================="
echo ""

# Prompt for database password
read -sp "Enter password for pasir_user: " DB_PASSWORD
echo ""
read -sp "Confirm password: " DB_PASSWORD_CONFIRM
echo ""

if [ "$DB_PASSWORD" != "$DB_PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords do not match!"
    exit 1
fi

echo ""
echo "🗄️  Creating database and user..."

# Create database and user
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE pasir_finance;

-- Create user
CREATE USER pasir_user WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pasir_finance TO pasir_user;

-- Set owner
ALTER DATABASE pasir_finance OWNER TO pasir_user;

-- Show databases
\l

-- Exit
\q
EOF

echo ""
echo "✅ Database created successfully!"
echo ""
echo "Database details:"
echo "  Name: pasir_finance"
echo "  User: pasir_user"
echo "  Password: [hidden]"
echo ""
echo "Connection string:"
echo "  postgresql://pasir_user:$DB_PASSWORD@localhost:5432/pasir_finance"
echo ""
echo "=================================="
echo "Next: Run migrations"
echo "=================================="
echo ""
echo "cd /var/www/pasir-backend"
echo "psql -U pasir_user -d pasir_finance -f migrations/001_init.sql"
echo ""

