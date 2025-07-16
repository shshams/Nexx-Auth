#!/usr/bin/env node
import { build } from 'vite';
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Starting Vercel build process...');

// Step 1: Build frontend
console.log('📦 Building frontend...');
try {
  await build();
  console.log('✅ Frontend build completed');
} catch (error) {
  console.error('❌ Frontend build failed:', error);
  process.exit(1);
}

// Step 2: Create API bundle without TypeScript checking
console.log('⚡ Building API...');
try {
  execSync(`npx esbuild api/index.ts --platform=node --packages=external --bundle --format=esm --outfile=api/index.js --external:ws --log-level=warning`, { stdio: 'inherit' });
  console.log('✅ API build completed');
} catch (error) {
  console.error('❌ API build failed:', error);
  process.exit(1);
}

// Step 3: Verify build outputs
console.log('🔍 Verifying build outputs...');
if (!fs.existsSync('dist/public/index.html')) {
  console.error('❌ Frontend build missing index.html');
  process.exit(1);
}

if (!fs.existsSync('api/index.js')) {
  console.error('❌ API build missing index.js');
  process.exit(1);
}

console.log('✅ Build verification completed');
console.log('🎉 Vercel build process completed successfully!');