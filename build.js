import { build } from 'vite';
import { execSync } from 'child_process';

// Build the frontend
console.log('Building frontend...');
await build();

// Build the API for Vercel
console.log('Building API...');
execSync('npx esbuild api/index.ts --platform=node --packages=external --bundle --format=esm --outfile=api/index.js', { stdio: 'inherit' });

console.log('Build complete!');