# 🚀 STEP BY STEP - Deploy Your App (Easy Mode)

You have Supabase database ready! Now let's deploy everything.

---

## ✅ What You Have

- [x] Supabase Database (Ready!)
- [x] Hostinger Single Hosting (For frontend)
- [x] Domain name
- [x] Backend code
- [x] Frontend code

---

## 📋 What We'll Do (30 Minutes Total)

```
Step 1: Setup Database Tables (5 min) ✅ START HERE
Step 2: Deploy Backend to Railway (10 min)
Step 3: Update Frontend Code (5 min)
Step 4: Upload Frontend to Hostinger (10 min)
Step 5: Test Everything (5 min)
```

---

## STEP 1: Setup Database Tables (5 Minutes)

### 1.1 Go to Supabase

1. Open browser: https://supabase.com/dashboard
2. Login with your account
3. Click on your project: `uoddaqiwpdudgmovatbr`

### 1.2 Open SQL Editor

1. Click **"SQL Editor"** in the left sidebar
2. Click **"New query"** button

### 1.3 Run Database Setup

1. Open this file: `deployment/database-setup.sql`
2. Copy **ALL** the SQL code
3. Paste into Supabase SQL Editor
4. Click **"Run"** (or press Ctrl+Enter)

### 1.4 Verify

You should see:
```
Success. 4 rows returned
```

Showing tables: users, incomes, expenses, loans

✅ **Database is ready!**

---

## STEP 2: Deploy Backend to Railway (10 Minutes)

### 2.1 Sign Up

1. Go to: https://railway.app
2. Click **"Start a New Project"** or **"Login"**
3. Choose **"Login with GitHub"**
4. Authorize Railway

### 2.2 Create Project

1. Click **"New Project"**
2. Choose **"Deploy from GitHub repo"**

### 2.3 If You Don't Have GitHub Repo

**Option A: Create GitHub Repo First**

1. Go to: https://github.com/new
2. Repository name: `pasir-finance`
3. Make it Private
4. Click "Create repository"

5. In PowerShell:
```bash
cd C:\Users\Rifqi\Downloads\pasir-febrio

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pasir-finance.git
git push -u origin main
```

6. Back in Railway, select your new repo

**Option B: Use Railway CLI (Easier)**

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. In your server folder:
```bash
cd C:\Users\Rifqi\Downloads\pasir-febrio\server
railway init
railway up
```

### 2.4 Configure Environment Variables

**SUPER IMPORTANT!** Without these, your app won't work.

1. In Railway, click your deployed service
2. Click **"Variables"** tab
3. Click **"+ New Variable"**

Add these **EXACTLY** (one at a time):

**Variable 1:**
```
Name: PORT
Value: 4000
```

**Variable 2:**
```
Name: NODE_ENV
Value: production
```

**Variable 3:**
```
Name: DATABASE_URL
Value: postgresql://postgres:tres1221@db.uoddaqiwpdudgmovatbr.supabase.co:5432/postgres
```

**Variable 4:**
```
Name: JWT_SECRET
Value: pasir_finance_super_secret_key_change_in_production_123456789
```

**Variable 5:**
```
Name: EXPORT_TEMPLATE_PATH
Value: /app/templates/export_template.xlsx
```

**COPY THESE EXACTLY!** Even one wrong character will break it.

### 2.5 Get Your Backend URL

1. Click **"Settings"** tab
2. Find **"Networking"** or **"Domains"** section
3. Click **"Generate Domain"**
4. You'll get: `https://something.railway.app`

**SAVE THIS URL!** Write it down:

```
My Backend URL: https://______________.railway.app
```

### 2.6 Test Backend

1. Open browser
2. Go to: `https://YOUR-URL.railway.app/api/health`
3. Should see: `{"status":"ok"}`

✅ **Backend is live!**

If you see errors, check Railway logs:
- Click "Deployments" tab
- Click latest deployment
- View logs for errors

---

## STEP 3: Update Frontend Code (5 Minutes)

Now we need to tell the frontend where your backend is.

### 3.1 Create API Config File

Create new file: `client/src/config.js`

```javascript
// API Configuration
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://YOUR-RAILWAY-URL.railway.app/api'  // REPLACE THIS!
  : '/api';
```

**REPLACE `YOUR-RAILWAY-URL`** with your actual Railway URL!

Example:
```javascript
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://pasir-backend-production.railway.app/api'
  : '/api';
```

### 3.2 I'll Update Your Frontend Files

Let me update all your page files to use the Railway backend...

---

## STEP 4: Upload Frontend to Hostinger (10 Minutes)

### 4.1 Build Frontend

In PowerShell:
```bash
cd C:\Users\Rifqi\Downloads\pasir-febrio\client
npm run build
```

This creates a `dist` folder with your website files.

### 4.2 Access Hostinger File Manager

1. Login to Hostinger: https://hpanel.hostinger.com
2. Click **"Hosting"**
3. Click **"Files"** or **"File Manager"**
4. You'll see a list of files

### 4.3 Clear Old Files

1. Find the `public_html` folder
2. Delete everything inside (select all, delete)
3. Leave the folder empty

### 4.4 Upload New Files

**Option A: File Manager Upload**

1. Click "Upload" button
2. Click "Select Files"
3. Go to: `C:\Users\Rifqi\Downloads\pasir-febrio\client\dist`
4. Select **ALL** files in dist folder:
   - `index.html`
   - `assets` folder
5. Upload

**Option B: FTP (Easier for large files)**

1. Download FileZilla: https://filezilla-project.org
2. Get FTP credentials from Hostinger:
   - Go to Hosting → FTP Accounts
   - Note: Host, Username, Password, Port
3. Connect with FileZilla
4. Upload everything from `client/dist/` to `public_html/`

### 4.5 Verify Files

In File Manager, you should see:
```
public_html/
├── index.html
└── assets/
    ├── index-xxxxxxxx.js
    └── index-xxxxxxxx.css
```

---

## STEP 5: Test Everything (5 Minutes)

### 5.1 Visit Your Website

Go to: `http://yourdomain.com`

You should see your login page!

### 5.2 Test Login

```
Username: admin
Password: admin123
```

### 5.3 Test Features

- [ ] Dashboard loads
- [ ] Can add income
- [ ] Can add expense
- [ ] Can add loan
- [ ] Can view revenue
- [ ] Can export data

---

## ✅ SUCCESS CHECKLIST

- [ ] Supabase database has tables
- [ ] Railway backend is deployed
- [ ] Backend health check works
- [ ] Frontend is uploaded to Hostinger
- [ ] Website loads at your domain
- [ ] Can login successfully
- [ ] All features work

---

## 🚨 Common Problems & Fixes

### "Cannot connect to backend"

**Problem:** Frontend can't reach Railway backend

**Fix:**
1. Open browser console (F12)
2. Look for errors
3. Check if API_BASE_URL in config.js is correct
4. Make sure Railway backend is running

### "CORS Error"

**Problem:** Railway blocking requests from your domain

**Fix:**
Update `server/src/index.js`:
```javascript
app.use(cors({
  origin: [
    'http://yourdomain.com',
    'https://yourdomain.com',
    'http://localhost:5173'
  ],
  credentials: true
}));
```

Then redeploy to Railway.

### "Database connection error"

**Problem:** Can't connect to Supabase

**Fix:**
1. Check DATABASE_URL in Railway variables
2. Make sure Supabase project is active
3. Check if tables exist in Supabase

### "Page is blank"

**Problem:** Files not uploaded correctly

**Fix:**
1. Check if index.html is in public_html root
2. Check if assets folder exists
3. Clear browser cache (Ctrl+Shift+Delete)

---

## 📱 Your Complete Setup

```
Frontend:
URL: http://yourdomain.com
Hosted: Hostinger Single Hosting
Files: public_html/

Backend:
URL: https://your-backend.railway.app
Hosted: Railway (Free)
Status: Check at /api/health

Database:
Service: Supabase
Connection: postgresql://postgres:tres1221@db...
Tables: users, incomes, expenses, loans
```

---

## 🎉 You're Done!

Your app is now live at: **http://yourdomain.com**

### Next Steps (Optional):

1. **Add SSL (HTTPS):**
   - Hostinger provides free SSL
   - Go to Hosting → SSL
   - Enable for your domain

2. **Create More Users:**
   - Go to Supabase → Table Editor
   - Add rows to users table

3. **Monitor:**
   - Railway: View logs and metrics
   - Supabase: View database usage
   - Hostinger: Check website traffic

---

## 📞 Need Help?

**Backend not working:**
- Check Railway logs
- Check environment variables
- Test: /api/health endpoint

**Frontend not loading:**
- Check File Manager files
- Check browser console (F12)
- Clear cache

**Database errors:**
- Check Supabase dashboard
- Verify tables exist
- Check connection string

---

**You got this! Follow step by step and you'll be live in 30 minutes!** 🚀

