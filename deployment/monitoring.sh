#!/bin/bash

################################################################################
# Monitoring & Maintenance Script
# For Pasir Finance Application
################################################################################

APP_NAME="pasir-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Pasir Finance - System Monitor"
echo "=================================="
echo ""

# System Info
echo "📊 System Information:"
echo "-----------------------------------"
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -I | awk '{print $1}')"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Uptime: $(uptime -p)"
echo ""

# Disk Usage
echo "💾 Disk Usage:"
echo "-----------------------------------"
df -h / | tail -1 | awk '{print "Used: "$3" / "$2" ("$5")"}'
echo ""

# Memory Usage
echo "🧠 Memory Usage:"
echo "-----------------------------------"
free -h | grep Mem | awk '{print "Used: "$3" / "$2}'
echo ""

# CPU Info
echo "⚡ CPU Usage:"
echo "-----------------------------------"
top -bn1 | grep "Cpu(s)" | awk '{print "CPU: "$2"%"}'
echo ""

# Backend Status
echo "🚀 Backend Application:"
echo "-----------------------------------"
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo -e "${GREEN}✅ Status: Running${NC}"
    pm2 status $APP_NAME
else
    echo -e "${RED}❌ Status: Stopped${NC}"
fi
echo ""

# PostgreSQL Status
echo "🐘 PostgreSQL Database:"
echo "-----------------------------------"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ Status: Running${NC}"
    sudo systemctl status postgresql --no-pager | head -3
else
    echo -e "${RED}❌ Status: Stopped${NC}"
fi
echo ""

# Nginx Status
echo "🌐 Nginx Web Server:"
echo "-----------------------------------"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Status: Running${NC}"
    sudo systemctl status nginx --no-pager | head -3
else
    echo -e "${RED}❌ Status: Stopped${NC}"
fi
echo ""

# Recent Logs
echo "📝 Recent Backend Logs (last 10 lines):"
echo "-----------------------------------"
pm2 logs $APP_NAME --lines 10 --nostream
echo ""

# Menu
echo "=================================="
echo "Actions:"
echo "=================================="
echo "1. View full backend logs"
echo "2. View Nginx error logs"
echo "3. View PostgreSQL logs"
echo "4. Restart backend"
echo "5. Restart all services"
echo "6. Backup database"
echo "7. Exit"
echo ""
read -p "Select action (1-7): " ACTION

case $ACTION in
    1)
        pm2 logs $APP_NAME
        ;;
    2)
        sudo tail -f /var/log/nginx/error.log
        ;;
    3)
        sudo tail -f /var/log/postgresql/postgresql-15-main.log
        ;;
    4)
        pm2 restart $APP_NAME
        echo "✅ Backend restarted"
        ;;
    5)
        pm2 restart all
        sudo systemctl restart nginx
        sudo systemctl restart postgresql
        echo "✅ All services restarted"
        ;;
    6)
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        pg_dump -U pasir_user -d pasir_finance > /tmp/$BACKUP_FILE
        echo "✅ Database backed up to: /tmp/$BACKUP_FILE"
        ;;
    7)
        echo "Goodbye!"
        exit 0
        ;;
    *)
        echo "Invalid option"
        ;;
esac

