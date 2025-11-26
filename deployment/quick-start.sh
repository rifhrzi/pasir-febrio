#!/bin/bash

################################################################################
# Quick Start Script - Complete Deployment
# Run this after uploading all files to VPS
################################################################################

set -e

echo "=================================="
echo "Pasir Finance - Quick Deployment"
echo "=================================="
echo ""
echo "This script will:"
echo "  1. Setup PostgreSQL database"
echo "  2. Deploy backend"
echo "  3. Deploy frontend"
echo "  4. Configure Nginx"
echo ""
read -p "Continue? (yes/no): " CONTINUE

if [ "$CONTINUE" != "yes" ] && [ "$CONTINUE" != "y" ]; then
    echo "Aborted."
    exit 0
fi

# Step 1: Database Setup
echo ""
echo "===================================="
echo "Step 1: Database Setup"
echo "===================================="
./setup-database.sh

# Step 2: Backend Deployment
echo ""
echo "===================================="
echo "Step 2: Backend Deployment"
echo "===================================="
./deploy-backend.sh

# Step 3: Frontend Check
echo ""
echo "===================================="
echo "Step 3: Frontend Deployment"
echo "===================================="
./deploy-frontend.sh

# Step 4: Nginx Configuration
echo ""
echo "===================================="
echo "Step 4: Nginx Configuration"
echo "===================================="

if [ ! -f "/etc/nginx/sites-available/pasir-finance" ]; then
    echo "Copying Nginx configuration..."
    sudo cp nginx-config.conf /etc/nginx/sites-available/pasir-finance
    
    # Enable site
    sudo ln -s /etc/nginx/sites-available/pasir-finance /etc/nginx/sites-enabled/ 2>/dev/null || true
    
    # Remove default
    sudo rm /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # Test configuration
    sudo nginx -t
    
    # Reload Nginx
    sudo systemctl reload nginx
    
    echo "✅ Nginx configured!"
else
    echo "✅ Nginx already configured"
fi

# Final status
echo ""
echo "===================================="
echo "Deployment Complete! 🎉"
echo "===================================="
echo ""
echo "Backend Status:"
pm2 status pasir-backend
echo ""
echo "Access your application:"
echo "  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "To setup SSL certificate, run:"
echo "  ./install-ssl.sh"
echo ""

