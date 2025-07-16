# Quick Vercel Deployment Steps

## Step 1: Push to GitHub
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

## Step 2: Deploy to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set these environment variables:

### Required Environment Variables
```
DATABASE_URL=your_neon_database_url
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
SESSION_SECRET=your_random_session_secret
```

## Step 3: Configure Build Settings
The build settings are now handled by vercel.json, so you don't need to configure them manually in the Vercel dashboard. Just make sure:
- Node.js Version: `18.x` (set in dashboard if needed)

## Step 4: Deploy
Click "Deploy" and wait for the build to complete.

## Step 5: Setup Database
After deployment, run:
```bash
npm run db:push
```

## Step 6: Configure Firebase
Add your Vercel domain to Firebase authorized domains:
- Go to Firebase Console > Authentication > Settings
- Add `your-project.vercel.app` to authorized domains

## Your app will be live at: `https://your-project.vercel.app`