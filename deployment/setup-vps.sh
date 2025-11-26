#!/bin/bash

################################################################################
# Pasir Finance VPS Setup Script
# For Ubuntu 22.04 LTS
# 
# Usage: 
#   chmod +x setup-vps.sh
#   sudo ./setup-vps.sh
################################################################################

set -e

echo "=================================="
echo "Pasir Finance VPS Setup"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "Please run as root (use sudo)"
   exit 1
fi

# Get the actual user who invoked sudo
ACTUAL_USER=${SUDO_USER:-$USER}

echo "🔄 Updating system packages..."
apt update && apt upgrade -y

echo ""
echo "🔥 Configuring firewall..."
apt install ufw -y
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
ufw status

echo ""
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo ""
echo "🐘 Installing PostgreSQL 15..."
apt install postgresql postgresql-contrib -y
systemctl start postgresql
systemctl enable postgresql
echo "PostgreSQL installed: $(sudo -u postgres psql --version)"

echo ""
echo "⚡ Installing PM2 process manager..."
npm install -g pm2
echo "PM2 version: $(pm2 --version)"

echo ""
echo "🌐 Installing Nginx..."
apt install nginx -y
systemctl start nginx
systemctl enable nginx
systemctl status nginx --no-pager

echo ""
echo "📚 Installing additional tools..."
apt install git curl wget nano htop -y

echo ""
echo "🗄️  Creating directories..."
mkdir -p /var/www/pasir-backend
mkdir -p /var/www/pasir-frontend

# Set proper ownership if not root
if [ "$ACTUAL_USER" != "root" ]; then
    chown -R $ACTUAL_USER:$ACTUAL_USER /var/www/pasir-backend
    chown -R $ACTUAL_USER:$ACTUAL_USER /var/www/pasir-frontend
fi

echo ""
echo "✅ Basic setup complete!"
echo ""
echo "=================================="
echo "Next Steps:"
echo "=================================="
echo ""
echo "1. Setup PostgreSQL database:"
echo "   sudo -u postgres psql"
echo "   CREATE DATABASE pasir_finance;"
echo "   CREATE USER pasir_user WITH PASSWORD 'YourPassword';"
echo "   GRANT ALL PRIVILEGES ON DATABASE pasir_finance TO pasir_user;"
echo "   ALTER DATABASE pasir_finance OWNER TO pasir_user;"
echo "   \\q"
echo ""
echo "2. Upload backend files to: /var/www/pasir-backend/"
echo ""
echo "3. Upload frontend files to: /var/www/pasir-frontend/"
echo ""
echo "4. Configure Nginx (use nginx-config.conf)"
echo ""
echo "5. Start backend with PM2:"
echo "   cd /var/www/pasir-backend"
echo "   npm install --production"
echo "   pm2 start src/index.js --name pasir-backend"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "=================================="
echo "Installation Summary:"
echo "=================================="
echo "✅ Node.js: $(node --version)"
echo "✅ PostgreSQL: Installed"
echo "✅ Nginx: Running"
echo "✅ PM2: $(pm2 --version)"
echo "✅ Firewall: Configured (22, 80, 443)"
echo ""
echo "🎉 VPS is ready for deployment!"
echo ""

