#!/usr/bin/env node
import { build } from 'vite';
import fs from 'fs';

console.log('🚀 Starting build process...');

// Build frontend only - API will be built by Vercel
console.log('📦 Building frontend...');
try {
  await build();
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error);
  process.exit(1);
}

// Verify build outputs
console.log('🔍 Verifying build outputs...');
if (!fs.existsSync('dist/public/index.html')) {
  console.error('❌ Frontend build missing index.html');
  process.exit(1);
}

console.log('✅ Build verification completed');
console.log('🎉 Build process completed successfully!');