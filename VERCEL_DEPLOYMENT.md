# Vercel Deployment Guide for NexxAuth

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to a GitHub repository
3. **Environment Variables**: Have your environment variables ready

## Required Environment Variables

Set these in your Vercel dashboard under Project Settings > Environment Variables:

### Database
- `DATABASE_URL` - Your PostgreSQL connection string (recommend Neon or Supabase)
- `PGHOST` - Database host
- `PGPORT` - Database port  
- `PGUSER` - Database username
- `PGPASSWORD` - Database password
- `PGDATABASE` - Database name

### Firebase Authentication
- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID  
- `VITE_FIREBASE_APP_ID` - Your Firebase app ID

### Session Management
- `SESSION_SECRET` - Random string for session encryption

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will automatically detect the Next.js framework (it will work with our setup)

### 2. Configure Build Settings

- **Build Command**: `npm run build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### 3. Add Environment Variables

In your Vercel dashboard:
1. Go to Project Settings
2. Click "Environment Variables"
3. Add all the required variables listed above

### 4. Deploy

1. Click "Deploy"
2. Vercel will build and deploy your application
3. Your app will be available at `https://your-project-name.vercel.app`

## Database Setup

Since Vercel is serverless, you'll need a serverless-compatible database:

### Option 1: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`

### Option 2: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get the connection string from Settings > Database

## Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing
3. Enable Authentication
4. Add your Vercel domain to authorized domains:
   - Go to Authentication > Settings > Authorized domains
   - Add `your-project-name.vercel.app`

## Post-Deployment

### 1. Database Schema
After deployment, you'll need to push your database schema:
```bash
npm run db:push
```

### 2. Test Authentication
1. Visit your deployed app
2. Try logging in with Google
3. Check that the dashboard loads properly

## Troubleshooting

### Common Issues:

1. **Database Connection Errors**
   - Ensure `DATABASE_URL` is correct
   - Check that your database allows connections from Vercel's IP ranges

2. **Firebase Auth Errors**
   - Verify all Firebase environment variables are set
   - Check that your Vercel domain is in Firebase authorized domains

3. **Build Errors**
   - Check the build logs in Vercel dashboard
   - Ensure all dependencies are in `package.json`

## Support

If you encounter issues:
1. Check Vercel function logs in the dashboard
2. Verify all environment variables are set correctly
3. Ensure your database is accessible from Vercel's network