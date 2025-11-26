# 🚂 Railway Deployment - Root Directory Fix

## The Error You're Seeing

```
Root Directory `server` does not exist
```

This means Railway can't find the "server" folder in your repository.

---

## ✅ EASIEST FIX - Deploy Server Folder Directly

Instead of deploying via GitHub, deploy the server folder directly using Railway CLI.

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authorize.

### Step 3: Go to Server Folder

```bash
cd C:\Users\Rifqi\Downloads\pasir-febrio\server
```

**IMPORTANT:** You must be INSIDE the server folder!

### Step 4: Initialize Railway Project

```bash
railway init
```

You'll be asked:
- "Create a new project or select existing?" → Choose "Create new project"
- Enter project name: `pasir-backend`

### Step 5: Deploy

```bash
railway up
```

This will:
- Build your backend
- Deploy it to Railway
- Show you the URL

### Step 6: Add Environment Variables

```bash
# Add each variable
railway variables set PORT=4000
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=postgresql://postgres:tres1221@db.uoddaqiwpdudgmovatbr.supabase.co:5432/postgres
railway variables set JWT_SECRET=pasir_finance_super_secret_key_change_in_production_123456789
railway variables set EXPORT_TEMPLATE_PATH=/app/templates/export_template.xlsx
```

OR set them in Railway dashboard:
1. Go to https://railway.app/dashboard
2. Click your project
3. Click "Variables"
4. Add the 5 variables

### Step 7: Generate Domain

1. In Railway dashboard, click "Settings"
2. Find "Networking" → "Public Networking"
3. Click "Generate Domain"
4. Copy your URL: `https://something.railway.app`

### Step 8: Test

Visit: `https://your-url.railway.app/api/health`

Should return: `{"status":"ok"}`

✅ **Done!**

---

## Alternative Fix - If You Want to Use GitHub

### Option A: Push Only Server Folder to GitHub

Create a separate repository for just the backend:

```bash
cd C:\Users\Rifqi\Downloads\pasir-febrio\server

# Initialize git in server folder
git init
git add .
git commit -m "Initial backend commit"

# Create new GitHub repo called "pasir-backend"
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/pasir-backend.git
git push -u origin main
```

Then in Railway:
- Deploy from GitHub
- Select `pasir-backend` repo
- No need for Root Directory setting

### Option B: Keep Full Repository, Remove Root Directory

If your GitHub has this structure:
```
pasir-finance/
├── client/
├── deployment/
├── server/  ← folder exists here
└── README.md
```

Then in Railway:
1. Go to Settings
2. Root Directory: Leave **EMPTY** or type `./server`
3. Redeploy

If that doesn't work:
1. Delete the service
2. Create new deployment
3. When asked for root directory, type: `server` (without quotes)

---

## ⚠️ Common Mistakes

❌ **Wrong:** Root Directory = `./server/`  
✅ **Correct:** Root Directory = `server`

❌ **Wrong:** Root Directory = `/server`  
✅ **Correct:** Root Directory = `server`

❌ **Wrong:** Deploying from project root without setting Root Directory  
✅ **Correct:** Either deploy from server folder OR set Root Directory

---

## 🎯 Recommended Approach

**For Beginners (You):**
Use Railway CLI to deploy server folder directly (steps above).

**Why?**
- No GitHub needed
- No root directory issues
- Faster deployment
- Less confusion

**For Advanced:**
Use GitHub with proper root directory configuration.

---

## 📋 Quick Command Summary

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Deploy (run from server folder!)
cd C:\Users\Rifqi\Downloads\pasir-febrio\server
railway init
railway up

# Add variables
railway variables set PORT=4000
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=postgresql://postgres:tres1221@db.uoddaqiwpdudgmovatbr.supabase.co:5432/postgres
railway variables set JWT_SECRET=pasir_finance_super_secret_key_change_in_production_123456789
railway variables set EXPORT_TEMPLATE_PATH=/app/templates/export_template.xlsx

# Check status
railway status

# View logs
railway logs

# Get URL
railway domain
```

---

## ✅ Verification Steps

After deployment:

1. **Check Railway Dashboard:**
   - Project should show "Active"
   - Latest deployment should be "Success"

2. **Generate Domain:**
   - Settings → Generate Domain
   - Copy the URL

3. **Test Backend:**
   ```
   https://your-url.railway.app/api/health
   ```
   Should return: `{"status":"ok"}`

4. **Check Logs:**
   ```bash
   railway logs
   ```
   Should see: "Server running on port 4000"

---

## 🆘 Still Having Issues?

### Issue: "railway: command not found"

**Fix:**
```bash
# Close and reopen PowerShell, then:
npm install -g @railway/cli

# If still not working, use npx:
npx @railway/cli login
npx @railway/cli init
npx @railway/cli up
```

### Issue: "Failed to build"

**Check:**
1. Are you in the server folder? `cd server`
2. Does package.json exist? `ls package.json`
3. Check Railway build logs for specific error

### Issue: "Application failed to respond"

**Check:**
1. Environment variables are set
2. PORT is set to 4000
3. DATABASE_URL is correct
4. Check Railway logs: `railway logs`

---

## 💡 Pro Tip

After successful deployment, save your Railway project:

```bash
# In server folder, link to existing project
railway link

# Now you can update anytime with:
railway up
```

---

**Follow the EASIEST FIX above and you'll be deployed in 5 minutes!** 🚀

