# 🚂 Railway Deployment Setup

Your Supabase database is ready! Now let's deploy the backend to Railway.

## Your Database Info ✅

```
Database: Supabase PostgreSQL
Connection: postgresql://postgres:tres1221@db.uoddaqiwpdudgmovatbr.supabase.co:5432/postgres
Status: Ready to use
```

---

## Step 1: Setup Database Tables (Do This First!)

### Option A: Using Supabase Dashboard (EASIEST)

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"**
5. Copy and paste this SQL:

```sql
-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incomes
CREATE TABLE IF NOT EXISTS incomes (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  trans_date DATE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create default admin user (password: admin123)
INSERT INTO users (username, password_hash) VALUES
('admin', '$2b$10$rZ5kX7H8h9VkN3mYwQx/VuKFZGPZV8yLx7xqYx7VkN3mYwQx/VuKF')
ON CONFLICT (username) DO NOTHING;
```

6. Click **"Run"** or press `Ctrl+Enter`
7. You should see: "Success. No rows returned"
8. ✅ Database tables created!

### Option B: Using Local SQL File

```bash
# From your project folder
cd server
psql "postgresql://postgres:tres1221@db.uoddaqiwpdudgmovatbr.supabase.co:5432/postgres" -f migrations/001_init.sql
```

---

## Step 2: Deploy Backend to Railway

### 2.1 Sign Up to Railway

1. Go to: https://railway.app
2. Click **"Login"**
3. Choose **"Login with GitHub"**
4. Authorize Railway to access your GitHub

### 2.2 Create New Project

1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**

**Don't have GitHub repo?** No problem, use Option B below.

#### Option A: Deploy from GitHub (Recommended)

1. **Create GitHub repository first:**

   - Go to https://github.com/new
   - Name: `pasir-finance`
   - Create repository

2. **Push your code:**

   ```bash
   cd C:\Users\Rifqi\Downloads\pasir-febrio
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pasir-finance.git
   git push -u origin main
   ```

3. **In Railway:**
   - Select your `pasir-finance` repository
   - Click on the `server` folder (if Railway doesn't auto-detect)

#### Option B: Deploy Manually (Easier)

1. **Install Railway CLI:**

   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**

   ```bash
   railway login
   ```

3. **Deploy:**
   ```bash
   cd server
   railway init
   railway up
   ```

### 2.3 Configure Environment Variables

1. In Railway dashboard, click your service
2. Click **"Variables"** tab
3. Click **"New Variable"**
4. Add these variables one by one:

```
PORT = 4000

NODE_ENV = production

DATABASE_URL = postgresql://postgres:tres1221@db.uoddaqiwpdudgmovatbr.supabase.co:5432/postgres

JWT_SECRET = pasir_finance_super_secret_key_change_in_production_123456789

EXPORT_TEMPLATE_PATH = /app/templates/export_template.xlsx
```

**IMPORTANT:**

- Copy DATABASE_URL exactly as shown above
- Make sure there are no extra spaces

### 2.4 Set Root Directory (If needed)

If Railway deployed the whole project instead of just server:

1. Click **"Settings"** tab
2. Find **"Root Directory"**
3. Set to: `server`
4. Click **"Save"**

### 2.5 Deploy

1. Click **"Deployments"** tab
2. Click **"Deploy"** (if not auto-deploying)
3. Wait 2-3 minutes for build to complete

### 2.6 Get Your Backend URL

1. Click **"Settings"** tab
2. Scroll to **"Domains"**
3. Click **"Generate Domain"**
4. You'll get something like: `pasir-backend.railway.app`
5. **Save this URL!** You'll need it for frontend

### 2.7 Test Your Backend

Open browser and visit:

```
https://pasir-backend.railway.app/api/health
```

Should return:

```json
{ "status": "ok" }
```

✅ Backend is live!

---

## Step 3: Update Frontend to Use Railway Backend

Now we need to tell the frontend where the backend is.

### 3.1 Update API Base URL in All Pages

I'll update all your page files to use an environment variable:

**Files to update:**

- `client/src/pages/Dashboard.jsx`
- `client/src/pages/Income.jsx`
- `client/src/pages/Expense.jsx`
- `client/src/pages/Loans.jsx`
- `client/src/pages/Revenue.jsx`

---

## Step 4: Test Everything

1. **Test backend:**

   ```
   https://your-backend.railway.app/api/health
   ```

2. **Test database connection:**
   Go to Supabase → Table Editor → Should see your tables

3. **Test login:**
   - Username: `admin`
   - Password: `admin123`

---

## 🎯 Next Steps

After Railway is deployed:

1. I'll update your frontend code
2. You'll rebuild frontend
3. Upload to Hostinger
4. Point your domain
5. ✅ Done!

---

## 🚨 Troubleshooting

### "Application failed to respond"

- Check Railway logs for errors
- Make sure all environment variables are set
- Check PORT is set to 4000

### "Database connection failed"

- Check DATABASE_URL is correct
- Make sure Supabase project is active
- Check if tables were created

### "Cannot find module"

- Railway didn't install dependencies
- Check package.json exists
- Try redeploying

---

## 📞 Your Current Setup

```
✅ Database: Supabase (configured)
   URL: db.uoddaqiwpdudgmovatbr.supabase.co

⏳ Backend: Railway (deploying now)
   URL: (will be generated)

⏳ Frontend: Hostinger (next step)
   Domain: (your domain)
```

---

Let me know when Railway backend is deployed, and I'll help you connect the frontend!
