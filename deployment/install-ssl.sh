#!/bin/bash

################################################################################
# SSL Certificate Installation Script
# Uses Let's Encrypt (Free SSL)
################################################################################

set -e

echo "=================================="
echo "SSL Certificate Installation"
echo "=================================="
echo ""

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx is not installed!"
    exit 1
fi

# Check if Certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y
fi

echo "Please enter your domain name (e.g., example.com):"
read -p "Domain: " DOMAIN

echo ""
echo "Do you want to include www subdomain? (yes/no)"
read -p "Include www? " INCLUDE_WWW

if [ "$INCLUDE_WWW" = "yes" ] || [ "$INCLUDE_WWW" = "y" ]; then
    DOMAINS="-d $DOMAIN -d www.$DOMAIN"
else
    DOMAINS="-d $DOMAIN"
fi

echo ""
echo "🔒 Obtaining SSL certificate for: $DOMAINS"
echo ""

# Get SSL certificate
sudo certbot --nginx $DOMAINS

echo ""
echo "✅ SSL certificate installed!"
echo ""
echo "Testing auto-renewal..."
sudo certbot renew --dry-run

echo ""
echo "=================================="
echo "SSL Setup Complete!"
echo "=================================="
echo ""
echo "Your site is now accessible via HTTPS:"
echo "  https://$DOMAIN"
if [ "$INCLUDE_WWW" = "yes" ] || [ "$INCLUDE_WWW" = "y" ]; then
    echo "  https://www.$DOMAIN"
fi
echo ""
echo "Certificate will auto-renew every 90 days."
echo ""

