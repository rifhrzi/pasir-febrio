# 🚀 Pasir Finance - Quick Reference Card

## VPS Order Details

### What to Select When Ordering

**Hosting Provider:** Hostinger VPS
**Package:** VPS 2 (Recommended) or VPS 1 (Budget)
**Operating System:** ⭐ **Ubuntu 22.04 LTS (64-bit)**
**Location:** Choose nearest to Indonesia (Singapore or India)

### VPS Specifications Comparison

| Feature | VPS 1 | VPS 2 ⭐ |
|---------|-------|---------|
| Price | ~$4/month | ~$8/month |
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| Bandwidth | 1 TB | 2 TB |
| **Recommended** | Small sites | **Production** |

---

## 📋 Complete Deployment Checklist

### Before You Start
- [ ] Order Hostinger VPS with Ubuntu 22.04
- [ ] Receive VPS IP address
- [ ] SSH credentials ready
- [ ] Domain name (optional, for SSL)

### Step 1: Initial Connection
```bash
# Connect via SSH
ssh root@YOUR_VPS_IP

# When prompted, enter your VPS password
```

### Step 2: Upload Deployment Scripts
```bash
# From Windows PowerShell (on your PC)
scp -r C:\Users\Rifqi\Downloads\pasir-febrio\deployment root@YOUR_VPS_IP:/root/
```

### Step 3: Run Automated Setup
```bash
# On VPS
cd /root/deployment
chmod +x *.sh
sudo ./setup-vps.sh
```
⏱️ Takes ~5-10 minutes

### Step 4: Setup Database
```bash
./setup-database.sh
```
- Enter a strong password for database
- Remember this password!

### Step 5: Upload Application Files

**Backend:**
```bash
# From your PC
scp -r C:\Users\Rifqi\Downloads\pasir-febrio\server\* root@YOUR_VPS_IP:/var/www/pasir-backend/
```

**Frontend:**
```bash
# Build first on your PC
cd C:\Users\Rifqi\Downloads\pasir-febrio\client
npm run build

# Upload
scp -r dist\* root@YOUR_VPS_IP:/var/www/pasir-frontend/
```

### Step 6: Configure Environment
```bash
# On VPS
cd /var/www/pasir-backend
nano .env
```

Add:
```env
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://pasir_user:YOUR_DB_PASSWORD@localhost:5432/pasir_finance
JWT_SECRET=your_random_secret_key_here_make_it_long
EXPORT_TEMPLATE_PATH=/var/www/pasir-backend/templates/export_template.xlsx
```

Save: `Ctrl+X`, `Y`, `Enter`

### Step 7: Deploy Backend
```bash
cd /root/deployment
./deploy-backend.sh
```

### Step 8: Configure Nginx
```bash
# Copy config
sudo cp nginx-config.conf /etc/nginx/sites-available/pasir-finance

# Edit to add your IP or domain
sudo nano /etc/nginx/sites-available/pasir-finance
# Change: server_name YOUR_VPS_IP;

# Enable site
sudo ln -s /etc/nginx/sites-available/pasir-finance /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Test Application
```bash
# Check backend
curl http://localhost:4000/api/health

# Should return: {"status":"ok"}
```

Open browser: `http://YOUR_VPS_IP`

### Step 10: Install SSL (Optional, if you have domain)
```bash
./install-ssl.sh
```

---

## 🔧 Essential Commands

### Check Status
```bash
# Everything at once
./monitoring.sh

# Individual services
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

### View Logs
```bash
# Backend logs
pm2 logs pasir-backend

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Restart Services
```bash
# Backend only
pm2 restart pasir-backend

# Nginx
sudo systemctl restart nginx

# PostgreSQL
sudo systemctl restart postgresql

# Everything
pm2 restart all && sudo systemctl restart nginx
```

### Update Application
```bash
# 1. Stop backend
pm2 stop pasir-backend

# 2. Upload new files (from PC)
scp -r server/* root@YOUR_VPS_IP:/var/www/pasir-backend/

# 3. Install dependencies
cd /var/www/pasir-backend
npm install --production

# 4. Restart
pm2 restart pasir-backend

# 5. Update frontend
scp -r client/dist/* root@YOUR_VPS_IP:/var/www/pasir-frontend/
```

### Database Backup
```bash
# Create backup
pg_dump -U pasir_user -d pasir_finance > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U pasir_user -d pasir_finance < backup_20250124.sql
```

---

## 🚨 Troubleshooting

### Backend Not Starting
```bash
# Check logs
pm2 logs pasir-backend --lines 50

# Common issues:
# - Database connection: Check .env DATABASE_URL
# - Port in use: sudo lsof -i :4000
# - Missing dependencies: cd /var/www/pasir-backend && npm install
```

### 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Check Nginx config
sudo nginx -t

# Restart both
pm2 restart pasir-backend
sudo systemctl restart nginx
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U pasir_user -d pasir_finance
# Enter password

# If fails, check DATABASE_URL in .env
```

### Frontend Shows Blank Page
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check files exist
ls -la /var/www/pasir-frontend/

# Fix permissions
sudo chown -R www-data:www-data /var/www/pasir-frontend/
sudo chmod -R 755 /var/www/pasir-frontend/
```

---

## 📞 Important Information

### Your VPS Details (Fill In)
```
VPS IP Address: ___________________
SSH Username: root
SSH Password: ___________________
Database Password: ___________________
JWT Secret: ___________________
Domain (if any): ___________________
```

### Access Points
```
Application: http://YOUR_VPS_IP
API Health: http://YOUR_VPS_IP/api/health
SSH: ssh root@YOUR_VPS_IP
```

### File Locations
```
Backend: /var/www/pasir-backend/
Frontend: /var/www/pasir-frontend/
Nginx Config: /etc/nginx/sites-available/pasir-finance
Logs: /var/log/nginx/
PM2 Logs: ~/.pm2/logs/
```

---

## 💰 Monthly Costs

| Item | Cost |
|------|------|
| Hostinger VPS 2 | $8 |
| Domain .com | ~$1 |
| SSL Certificate | $0 (Let's Encrypt) |
| **Total** | **~$9/month** |

---

## ✅ Post-Deployment Checklist

- [ ] VPS accessible via SSH
- [ ] All software installed (Node, PostgreSQL, Nginx)
- [ ] Database created and migrations run
- [ ] Backend running (`pm2 status` shows online)
- [ ] Frontend files uploaded
- [ ] Nginx configured and running
- [ ] Application accessible in browser
- [ ] API health check working
- [ ] SSL installed (if using domain)
- [ ] PM2 auto-restart enabled
- [ ] First database backup created

---

## 🎯 Quick Commands Summary

```bash
# Everything in one command
./monitoring.sh           # Check all services

# Service control
pm2 restart pasir-backend # Restart backend
sudo systemctl restart nginx    # Restart web server

# View what's happening
pm2 logs pasir-backend    # Backend logs
pm2 monit                 # Live monitoring

# Database
pg_dump -U pasir_user -d pasir_finance > backup.sql  # Backup

# Updates
./deploy-backend.sh       # Redeploy backend
./deploy-frontend.sh      # Redeploy frontend
```

---

## 📚 Need Help?

1. **Check Monitoring:** `./monitoring.sh`
2. **View Logs:** `pm2 logs pasir-backend`
3. **Read Full Guide:** `VPS_SETUP_GUIDE.md`
4. **Check Service Status:**
   ```bash
   pm2 status
   sudo systemctl status nginx
   sudo systemctl status postgresql
   ```

---

## 🎉 You're All Set!

Save this reference card for quick access to common tasks!

**Remember:**
- Keep your passwords secure
- Backup database regularly
- Monitor server resources
- Update application regularly

Good luck with your deployment! 🚀

