#!/bin/bash
echo "🚀 Starting Vercel build process..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# The API will be built by Vercel's @vercel/node builder
echo "✅ Frontend build completed"
echo "🎉 Build process completed successfully!"