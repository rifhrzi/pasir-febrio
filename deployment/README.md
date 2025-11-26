# 🚀 Deployment Scripts for Pasir Finance

Complete set of deployment scripts for setting up Pasir Finance on Hostinger VPS with Ubuntu 22.04.

## 📁 Files Overview

| File | Description |
|------|-------------|
| `VPS_SETUP_GUIDE.md` | Complete step-by-step manual guide |
| `setup-vps.sh` | Automated VPS initial setup |
| `setup-database.sh` | PostgreSQL database creation |
| `deploy-backend.sh` | Backend deployment script |
| `deploy-frontend.sh` | Frontend deployment script |
| `nginx-config.conf` | Nginx web server configuration |
| `install-ssl.sh` | SSL certificate installation |
| `quick-start.sh` | Complete automated deployment |
| `monitoring.sh` | System monitoring & maintenance |

## 🎯 Quick Start (Recommended Path)

### Step 1: Order VPS
1. Go to [Hostinger VPS](https://hostinger.com/vps-hosting)
2. Select **VPS 2** (recommended) or VPS 1
3. Choose **Ubuntu 22.04 LTS** as OS
4. Complete purchase

### Step 2: Connect to VPS
```bash
# From Windows PowerShell or use PuTTY
ssh root@your.vps.ip.address
```

### Step 3: Upload Scripts
Upload the entire `deployment` folder to your VPS:
```bash
scp -r deployment root@your.vps.ip:/root/
```

Or use FileZilla/WinSCP

### Step 4: Run Setup
```bash
cd /root/deployment

# Make scripts executable
chmod +x *.sh

# Run automated setup
sudo ./setup-vps.sh
```

### Step 5: Upload Application Files

**Backend:**
```bash
scp -r server root@your.vps.ip:/var/www/pasir-backend/
```

**Frontend (build first on your PC):**
```bash
cd client
npm run build
scp -r dist/* root@your.vps.ip:/var/www/pasir-frontend/
```

### Step 6: Deploy Everything
```bash
cd /root/deployment
./quick-start.sh
```

Follow the prompts to complete deployment.

### Step 7: Configure Domain (Optional)
Point your domain A record to VPS IP, then:
```bash
./install-ssl.sh
```

## 📖 Manual Step-by-Step

If you prefer manual setup, follow `VPS_SETUP_GUIDE.md`

## 🔧 Individual Scripts Usage

### Initial VPS Setup
```bash
chmod +x setup-vps.sh
sudo ./setup-vps.sh
```
Installs: Node.js, PostgreSQL, Nginx, PM2, Git

### Database Setup
```bash
chmod +x setup-database.sh
./setup-database.sh
```
Creates database and user

### Deploy Backend
```bash
chmod +x deploy-backend.sh
./deploy-backend.sh
```
Installs dependencies, runs migrations, starts PM2

### Deploy Frontend
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```
Sets up frontend directory and permissions

### Install SSL
```bash
chmod +x install-ssl.sh
./install-ssl.sh
```
Installs Let's Encrypt SSL certificate

### Monitor System
```bash
chmod +x monitoring.sh
./monitoring.sh
```
Check status and logs

## 📋 Prerequisites Checklist

Before deploying:
- ✅ Hostinger VPS ordered with Ubuntu 22.04
- ✅ VPS IP address noted
- ✅ SSH access working
- ✅ Domain pointed to VPS (optional, for SSL)
- ✅ Backend code ready in `server/` folder
- ✅ Frontend built in `client/dist/` folder

## 🌐 Accessing Your Application

After deployment:
- **HTTP:** `http://your.vps.ip.address`
- **HTTPS (after SSL):** `https://your-domain.com`
- **API Health:** `http://your.vps.ip.address/api/health`

## 🔐 Default Login

Create your first user via SQL:
```bash
sudo -u postgres psql -d pasir_finance
INSERT INTO users (username, password_hash) VALUES ('admin', '$2b$10$...');
```

Or use your existing auth endpoint.

## 🛠️ Maintenance Commands

### View Status
```bash
./monitoring.sh
```

### Restart Services
```bash
pm2 restart pasir-backend
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

### View Logs
```bash
pm2 logs pasir-backend
sudo tail -f /var/log/nginx/error.log
```

### Backup Database
```bash
pg_dump -U pasir_user -d pasir_finance > backup.sql
```

### Update Application
```bash
# Stop backend
pm2 stop pasir-backend

# Upload new code
scp -r server root@your.vps.ip:/var/www/pasir-backend/

# Restart
pm2 restart pasir-backend

# Upload new frontend build
scp -r client/dist/* root@your.vps.ip:/var/www/pasir-frontend/
```

## 🚨 Troubleshooting

### Backend won't start
```bash
pm2 logs pasir-backend --lines 50
```
Check for database connection errors or missing .env

### 502 Bad Gateway
Backend is not running or wrong port in Nginx config
```bash
pm2 status
sudo nginx -t
```

### Database connection failed
```bash
sudo systemctl status postgresql
# Check .env DATABASE_URL
```

## 📊 VPS Specifications

### Minimum (VPS 1)
- 1 vCPU
- 2 GB RAM
- 40 GB SSD
- 1 TB Bandwidth
- **Cost:** ~$4/month

### Recommended (VPS 2)
- 2 vCPU
- 4 GB RAM
- 80 GB SSD
- 2 TB Bandwidth
- **Cost:** ~$8/month

## 📞 Support

If you encounter issues:

1. Check logs: `./monitoring.sh`
2. Verify services: `pm2 status`, `systemctl status nginx`
3. Review `VPS_SETUP_GUIDE.md` troubleshooting section

## 🔗 Useful Links

- [Hostinger VPS Documentation](https://support.hostinger.com/en/collections/1569677-vps)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/)

## ✅ Post-Deployment Checklist

- ✅ VPS setup complete
- ✅ Database created
- ✅ Backend running (check with `pm2 status`)
- ✅ Frontend accessible
- ✅ Nginx configured
- ✅ SSL installed (optional)
- ✅ PM2 auto-restart enabled
- ✅ Firewall configured
- ✅ First backup created

## 🎉 You're Done!

Your Pasir Finance application should now be live!

Access it at: `http://your.vps.ip.address` or `https://your-domain.com`

