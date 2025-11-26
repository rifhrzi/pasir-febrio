#!/bin/bash

################################################################################
# Frontend Deployment Script
# For Pasir Finance Application
################################################################################

set -e

FRONTEND_DIR="/var/www/pasir-frontend"

echo "=================================="
echo "Frontend Deployment"
echo "=================================="
echo ""

# Check if directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Creating frontend directory..."
    sudo mkdir -p $FRONTEND_DIR
fi

echo "📁 Frontend directory: $FRONTEND_DIR"
echo ""
echo "Please upload your frontend build files to this directory."
echo ""
echo "From your local machine, run:"
echo "  scp -r client/dist/* username@your-vps-ip:$FRONTEND_DIR/"
echo ""
echo "Or use FileZilla/WinSCP to upload files from:"
echo "  client/dist/ → $FRONTEND_DIR/"
echo ""

# Check if files exist
if [ -f "$FRONTEND_DIR/index.html" ]; then
    echo "✅ Frontend files detected!"
    echo ""
    echo "Files in $FRONTEND_DIR:"
    ls -lh $FRONTEND_DIR/
    
    echo ""
    echo "🔐 Setting permissions..."
    sudo chown -R www-data:www-data $FRONTEND_DIR
    sudo chmod -R 755 $FRONTEND_DIR
    
    echo ""
    echo "✅ Frontend deployed successfully!"
    echo ""
    echo "Access your application at:"
    echo "  http://$(hostname -I | awk '{print $1}')"
    echo ""
else
    echo "⚠️  No files found in $FRONTEND_DIR"
    echo "Please upload your frontend build files first."
fi

echo ""
echo "=================================="

