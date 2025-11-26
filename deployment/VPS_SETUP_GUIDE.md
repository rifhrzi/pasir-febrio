# Complete VPS Setup Guide for Pasir Finance

## 🖥️ VPS Specifications & OS Selection

### Recommended VPS Package
- **Package:** Hostinger VPS 1 or VPS 2
- **RAM:** Minimum 2 GB (VPS 2 recommended)
- **Storage:** 40-80 GB SSD
- **CPU:** 1-2 cores
- **Bandwidth:** 1-2 TB

### Operating System Selection
**RECOMMENDED: Ubuntu 22.04 LTS (64-bit)**

**Why Ubuntu 22.04?**
- ✅ Long-term support (until 2027)
- ✅ Most popular, extensive documentation
- ✅ Easy package management (apt)
- ✅ Compatible with all required software
- ✅ Regular security updates
- ✅ Best for beginners

**Alternative Options:**
- Ubuntu 20.04 LTS (also good)
- Debian 11 (more stable, less up-to-date)
- CentOS Stream 9 (if you prefer RedHat-based)

---

## 📋 System Requirements

Your application needs:
- ✅ Node.js 18.x or 20.x
- ✅ PostgreSQL 14 or 15
- ✅ Nginx (web server & reverse proxy)
- ✅ PM2 (process manager)
- ✅ Git (for version control)
- ✅ SSL certificate (Let's Encrypt)

---

## 🚀 Complete Setup Process

### Phase 1: Order & Access VPS

1. **Order Hostinger VPS**
   - Go to Hostinger → VPS Hosting
   - Select VPS 1 or VPS 2
   - Choose **Ubuntu 22.04 LTS** as OS
   - Complete purchase

2. **Access VPS Panel**
   - Login to Hostinger Panel
   - Go to VPS → Your VPS
   - Note down:
     - IP Address: `your.vps.ip.address`
     - SSH Port: `22` (default)
     - Root password (or create SSH key)

3. **Connect via SSH**
   ```bash
   # Windows (PowerShell or use PuTTY)
   ssh root@your.vps.ip.address
   
   # Enter password when prompted
   ```

---

### Phase 2: Initial Server Setup (Security First!)

Run these commands in order:

#### 2.1 Update System
```bash
apt update && apt upgrade -y
```

#### 2.2 Create Non-Root User (Security Best Practice)
```bash
# Create new user
adduser pasir
# Enter password and information

# Add to sudo group
usermod -aG sudo pasir

# Switch to new user
su - pasir
```

#### 2.3 Configure Firewall
```bash
# Install UFW firewall
sudo apt install ufw -y

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

### Phase 3: Install Required Software

Use the automated script provided in `setup-vps.sh`

Or manually:

#### 3.1 Install Node.js 20.x
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

#### 3.2 Install PostgreSQL 15
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo -u postgres psql --version
```

#### 3.3 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

#### 3.4 Install Nginx
```bash
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

#### 3.5 Install Git
```bash
sudo apt install git -y
git --version
```

---

### Phase 4: Configure PostgreSQL Database

#### 4.1 Create Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

# Run these SQL commands:
CREATE DATABASE pasir_finance;
CREATE USER pasir_user WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE pasir_finance TO pasir_user;
ALTER DATABASE pasir_finance OWNER TO pasir_user;

# Exit PostgreSQL
\q
```

#### 4.2 Configure PostgreSQL for Remote Access (if needed)
```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/15/main/postgresql.conf

# Find and change:
listen_addresses = 'localhost'

# Edit pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add this line for local access:
local   all             pasir_user                              md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

### Phase 5: Deploy Backend Application

#### 5.1 Create Application Directory
```bash
# Create directory
sudo mkdir -p /var/www/pasir-backend
sudo chown -R pasir:pasir /var/www/pasir-backend

# Navigate to directory
cd /var/www/pasir-backend
```

#### 5.2 Upload Backend Files

**Option A: Using Git (Recommended)**
```bash
# If you have GitHub repo
git clone https://github.com/yourusername/pasir-febrio.git .
cd server
```

**Option B: Using SFTP/SCP**
```bash
# From your local machine
scp -r C:\Users\Rifqi\Downloads\pasir-febrio\server pasir@your.vps.ip:/var/www/pasir-backend/
```

**Option C: Manual Upload**
- Use FileZilla or WinSCP
- Connect to your VPS
- Upload `server` folder to `/var/www/pasir-backend/`

#### 5.3 Install Dependencies
```bash
cd /var/www/pasir-backend
npm install --production
```

#### 5.4 Create Environment File
```bash
nano .env
```

Add this content (modify values):
```env
PORT=4000
NODE_ENV=production
DATABASE_URL=postgresql://pasir_user:YourSecurePassword123!@localhost:5432/pasir_finance
JWT_SECRET=your_super_secret_jwt_key_change_this_123456
EXPORT_TEMPLATE_PATH=/var/www/pasir-backend/templates/export_template.xlsx
```

Save with `Ctrl + X`, then `Y`, then `Enter`

#### 5.5 Run Database Migrations
```bash
psql -U pasir_user -d pasir_finance -f migrations/001_init.sql
# Enter password when prompted
```

#### 5.6 Test Backend
```bash
# Test run
npm start

# Should see: "Server running on port 4000"
# Press Ctrl+C to stop
```

---

### Phase 6: Configure PM2 (Keep Backend Running)

#### 6.1 Start Backend with PM2
```bash
cd /var/www/pasir-backend

# Start application
pm2 start src/index.js --name pasir-backend

# View logs
pm2 logs pasir-backend

# Check status
pm2 status
```

#### 6.2 Configure PM2 Startup (Auto-restart on reboot)
```bash
# Generate startup script
pm2 startup

# Copy and run the command it shows (sudo command)

# Save current PM2 processes
pm2 save
```

#### 6.3 PM2 Useful Commands
```bash
pm2 restart pasir-backend   # Restart app
pm2 stop pasir-backend       # Stop app
pm2 logs pasir-backend       # View logs
pm2 monit                    # Monitor resources
pm2 delete pasir-backend     # Remove from PM2
```

---

### Phase 7: Deploy Frontend Application

#### 7.1 Create Frontend Directory
```bash
sudo mkdir -p /var/www/pasir-frontend
sudo chown -R pasir:pasir /var/www/pasir-frontend
```

#### 7.2 Upload Frontend Build Files

**Upload the `dist` folder from your local machine:**

```bash
# From Windows PowerShell
scp -r C:\Users\Rifqi\Downloads\pasir-febrio\client\dist\* pasir@your.vps.ip:/var/www/pasir-frontend/
```

Or use FileZilla/WinSCP to upload everything from `client/dist/` to `/var/www/pasir-frontend/`

---

### Phase 8: Configure Nginx (Web Server)

#### 8.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/pasir-finance
```

Use the config from `nginx-config.conf` file provided

#### 8.2 Enable Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/pasir-finance /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Phase 9: Configure Domain & SSL (Optional but Recommended)

#### 9.1 Point Domain to VPS
In your domain registrar (Hostinger, Namecheap, etc.):
- Add A record: `@` → `your.vps.ip.address`
- Add A record: `www` → `your.vps.ip.address`

Wait 5-30 minutes for DNS propagation

#### 9.2 Install SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts, enter email, agree to terms

# Auto-renewal test
sudo certbot renew --dry-run
```

---

## ✅ Verification & Testing

### Test Backend API
```bash
# From VPS
curl http://localhost:4000/api/health

# Should return: {"status":"ok"}
```

### Test from Browser
```
http://your.vps.ip.address/api/health
```

### Test Full Application
```
http://your.vps.ip.address
```

Login with default credentials (or create user via SQL)

---

## 🔧 Maintenance & Monitoring

### View Logs
```bash
# Backend logs
pm2 logs pasir-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Update Application
```bash
# Stop backend
pm2 stop pasir-backend

# Pull latest code (if using git)
cd /var/www/pasir-backend
git pull

# Install new dependencies
npm install --production

# Restart backend
pm2 restart pasir-backend

# Upload new frontend build
# (upload new dist files to /var/www/pasir-frontend/)
```

### Backup Database
```bash
# Create backup
pg_dump -U pasir_user -d pasir_finance > backup_$(date +%Y%m%d).sql

# Restore backup
psql -U pasir_user -d pasir_finance < backup_20250124.sql
```

---

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check PM2 logs
pm2 logs pasir-backend --lines 100

# Check if port is in use
sudo lsof -i :4000

# Check database connection
psql -U pasir_user -d pasir_finance
```

### Frontend shows blank page
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check file permissions
ls -la /var/www/pasir-frontend/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/pasir-frontend/
```

### Database connection failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database exists
sudo -u postgres psql -l
```

---

## 📊 Server Resource Monitoring

```bash
# Check CPU and memory usage
htop

# Check disk space
df -h

# Check PM2 metrics
pm2 monit

# Check Nginx connections
sudo systemctl status nginx
```

---

## 🔐 Security Checklist

- ✅ Use non-root user for deployment
- ✅ Configure firewall (UFW)
- ✅ Change default PostgreSQL passwords
- ✅ Use strong JWT_SECRET
- ✅ Enable SSL/HTTPS
- ✅ Regular system updates: `sudo apt update && sudo apt upgrade`
- ✅ Disable root SSH login (optional, advanced)
- ✅ Use SSH keys instead of passwords (optional)

---

## 💰 Cost Breakdown

| Item | Cost |
|------|------|
| Hostinger VPS 2 | $8/month |
| Domain (.com) | $10/year (~$1/month) |
| SSL Certificate | Free (Let's Encrypt) |
| **Total** | **~$9/month** |

---

## 📞 Need Help?

Common commands:
```bash
# Restart everything
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Check all services
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# View system resources
htop
df -h
free -m
```

---

**Next Steps:**
1. Order Hostinger VPS with Ubuntu 22.04
2. Run the automated setup script: `setup-vps.sh`
3. Configure your domain
4. Test the application
5. Set up SSL certificate

Good luck! 🚀

