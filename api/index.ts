import express from 'express';
import { registerRoutes } from '../server/routes.js';
import { serveStatic } from '../server/vite.js';

const app = express();

// Global server compatibility settings
app.use((req, res, next) => {
  // CORS headers for global access
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Security headers for global deployment
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Initialize routes for Vercel
async function initializeForVercel() {
  await registerRoutes(app);
  
  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    if (res.headersSent) {
      return next(err);
    }
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error(`Error ${status} on ${req.method} ${req.path}:`, err);
    res.status(status).json({ message });
  });
  
  // Don't serve static files in Vercel - handled by routes
  // serveStatic(app);
}

// Initialize the app
await initializeForVercel();

// Export the Express app as a Vercel serverless function
export default app;