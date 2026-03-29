# Louisiana Tax Advisor

AI-powered Louisiana state tax law lookup tool built with React + Vite, deployed on Vercel.

---

## 🚀 Deploy in 4 Steps

### Step 1 — Open this folder in VS Code
- Open VS Code
- File → Open Folder → select this `la-tax-advisor` folder

### Step 2 — Open the Terminal in VS Code
- Terminal → New Terminal (or press Ctrl+` )
- Run these two commands one at a time:

```
npm install
npm run dev
```

- Open your browser to http://localhost:5173 — the app should work locally!
- Press Ctrl+C to stop the local server when done testing.

### Step 3 — Push to GitHub
Run these commands in the VS Code terminal:

```
git init
git add .
git commit -m "Initial commit"
```

Then:
1. Go to https://github.com/new
2. Create a new repo named `la-tax-advisor` (keep it Public)
3. Copy the commands GitHub shows you under "push an existing repository" and run them in your terminal

### Step 4 — Deploy on Vercel
1. Go to https://vercel.com and sign in with GitHub
2. Click "Add New Project"
3. Find and import your `la-tax-advisor` repo
4. Click "Deploy" — Vercel auto-detects Vite ✅
5. Once deployed, go to your project → Settings → Environment Variables
6. Add: Name = `ANTHROPIC_API_KEY`, Value = your actual API key (starts with sk-ant-...)
7. Go to Deployments → click the 3 dots → Redeploy

Your app is live! 🎉

---

## 💰 API Cost
Each question costs roughly $0.01–0.05. Very affordable for personal use.

## 🔑 Get an API Key
https://console.anthropic.com → API Keys → Create Key
