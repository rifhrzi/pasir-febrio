#!/bin/bash

################################################################################
# Backend Deployment Script
# For Pasir Finance Application
################################################################################

set -e

APP_DIR="/var/www/pasir-backend"
APP_NAME="pasir-backend"

echo "=================================="
echo "Backend Deployment"
echo "=================================="
echo ""

# Check if directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Directory $APP_DIR does not exist!"
    echo "Please upload your backend files first."
    exit 1
fi

cd $APP_DIR

echo "📦 Installing dependencies..."
npm install --production

echo ""
echo "🔍 Checking .env file..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env template..."
    cat > .env <<EOF
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://pasir_user:YOUR_PASSWORD@localhost:5432/pasir_finance
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING_$(openssl rand -hex 32)
EXPORT_TEMPLATE_PATH=$APP_DIR/templates/export_template.xlsx
EOF
    echo "✅ Created .env file. Please edit it with your database password:"
    echo "   nano $APP_DIR/.env"
    exit 1
else
    echo "✅ .env file exists"
fi

echo ""
echo "🗄️  Running database migrations..."
if [ -f "migrations/001_init.sql" ]; then
    echo "Please enter database password when prompted:"
    psql -U pasir_user -d pasir_finance -f migrations/001_init.sql || {
        echo "⚠️  Migration failed or already run. Continuing..."
    }
else
    echo "⚠️  Migration file not found: migrations/001_init.sql"
fi

echo ""
echo "🧪 Testing backend..."
node src/index.js &
SERVER_PID=$!
sleep 3

# Test health endpoint
if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is responding!"
    kill $SERVER_PID
else
    echo "❌ Backend test failed!"
    kill $SERVER_PID
    exit 1
fi

echo ""
echo "⚡ Starting with PM2..."

# Stop if already running
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# Start with PM2
pm2 start src/index.js --name $APP_NAME

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup || true

echo ""
echo "✅ Backend deployed successfully!"
echo ""
echo "=================================="
echo "Application Status:"
echo "=================================="
pm2 status
echo ""
echo "View logs: pm2 logs $APP_NAME"
echo "Restart: pm2 restart $APP_NAME"
echo "Stop: pm2 stop $APP_NAME"
echo ""

