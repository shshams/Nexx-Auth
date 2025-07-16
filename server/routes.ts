import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requirePermission, requireRole, PERMISSIONS, ROLES, getUserPermissions } from "./permissions";
import { webhookService } from "./webhookService";
import { 
  insertApplicationSchema, 
  insertAppUserSchema, 
  updateApplicationSchema,
  updateAppUserSchema,
  insertLicenseKeySchema,
  loginSchema,
  insertWebhookSchema,
  insertBlacklistSchema
} from "@shared/schema";
import { z } from "zod";

// Middleware to validate API key for external API access
async function validateApiKey(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ success: false, message: "API key required" });
  }

  try {
    const application = await storage.getApplicationByApiKey(apiKey as string);
    if (!application || !application.isActive) {
      return res.status(401).json({ success: false, message: "Invalid or inactive API key" });
    }
    
    req.application = application;
    next();
  } catch (error) {
    console.error("API key validation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Debug route for testing authentication
  app.get('/api/debug/auth', async (req: any, res) => {
    try {
      console.log('Debug auth - Headers:', req.headers);
      console.log('Debug auth - Session:', req.session);
      console.log('Debug auth - User:', req.user);
      
      const accountId = req.headers['x-account-id'];
      if (accountId) {
        const user = await storage.getUser(accountId as string);
        console.log('Debug auth - Found user by account ID:', user);
        return res.json({
          status: 'authenticated',
          method: 'account-id-header',
          accountId,
          user
        });
      }
      
      if (req.session && (req.session as any).user) {
        return res.json({
          status: 'authenticated',
          method: 'session',
          user: (req.session as any).user
        });
      }
      
      res.json({
        status: 'not-authenticated',
        session: req.session,
        headers: req.headers
      });
    } catch (error) {
      console.error('Debug auth error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Auth check - req.user:', req.user);
      console.log('Auth check - session:', req.session);
      
      const userId = req.user.claims.sub;
      console.log('Fetching user for ID:', userId);
      
      const user = await storage.getUser(userId);
      console.log('Found user:', user);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const permissions = await getUserPermissions(userId);
      console.log('User permissions:', permissions);
      
      res.json({ ...user, userPermissions: permissions });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Firebase authentication route
  app.post('/api/auth/firebase-login', async (req: any, res) => {
    try {
      const { firebase_uid, email, display_name } = req.body;

      if (!firebase_uid || !email) {
        return res.status(400).json({ 
          success: false, 
          message: "Firebase UID and email are required" 
        });
      }

      console.log('Firebase login attempt:', { firebase_uid, email, display_name });

      // Create or update user in our system
      const userData = {
        id: firebase_uid,
        email: email,
        firstName: display_name?.split(' ')[0] || '',
        lastName: display_name?.split(' ').slice(1).join(' ') || '',
        profileImageUrl: null,
      };

      const user = await storage.upsertUser(userData);
      console.log('User upserted:', user);

      // Create session
      (req.session as any).user = {
        claims: {
          sub: firebase_uid,
          email: email,
        }
      };

      // Save session explicitly
      await new Promise((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      console.log('Session created and saved successfully');

      res.json({
        success: true,
        message: "Login successful! Redirecting to dashboard...",
        account_id: firebase_uid,
        user: user
      });

    } catch (error) {
      console.error("Firebase login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Authentication failed: " + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  });

  // Logout function to handle both GET and POST requests
  const handleLogout = async (req: any, res: any) => {
    try {
      console.log(`${req.method} /api/logout - Session before destroy:`, req.session);
      
      // Force clear session data immediately
      if (req.session) {
        req.session.user = null;
        req.session.destroy((err: any) => {
          if (err) {
            console.error('Error destroying session:', err);
          } else {
            console.log("Session destroyed successfully");
          }
        });
      }
      
      // Clear all possible session cookies with multiple domain variations
      const cookieOptions = [
        { path: '/' },
        { path: '/', domain: '.replit.app' },
        { path: '/', domain: '.replit.dev' },
        { path: '/', domain: '.replit.co' },
        { path: '/', secure: false, httpOnly: true },
        { path: '/', secure: true, httpOnly: true }
      ];
      
      cookieOptions.forEach(options => {
        res.clearCookie('connect.sid', options);
        res.clearCookie('session', options);
        res.clearCookie('.AuthSession', options);
      });
      
      // Set comprehensive cache control headers
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
        'Expires': 'Thu, 01 Jan 1970 00:00:00 GMT',
        'Pragma': 'no-cache',
        'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"'
      });
      
      // For GET requests, redirect to Firebase login page with logout flag
      if (req.method === 'GET') {
        console.log("GET logout - Redirecting to Firebase login");
        return res.redirect('/firebase-login?logged_out=true');
      }
      
      // For POST requests, return JSON
      res.json({ 
        success: true,
        message: "Logged out successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error in logout:", error);
      if (req.method === 'GET') {
        return res.redirect('/?logout_error=true');
      }
      res.status(500).json({ success: false, message: "Failed to logout" });
    }
  };

  // Logout routes - support both GET and POST
  app.post('/api/logout', handleLogout);
  app.get('/api/logout', handleLogout);

  // Dashboard stats with real-time information
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getAllApplications(userId);
      
      let totalUsers = 0;
      let totalActiveSessions = 0;
      let totalApiRequests = 0;
      
      for (const app of applications) {
        const users = await storage.getAllAppUsers(app.id);
        const activeSessions = await storage.getActiveSessions(app.id);
        const recentActivity = await storage.getActivityLogs(app.id, 1000);
        
        totalUsers += users.length;
        totalActiveSessions += activeSessions.length;
        totalApiRequests += recentActivity.length;
      }

      res.json({
        totalApplications: applications.length,
        totalUsers,
        activeApplications: applications.filter(app => app.isActive).length,
        totalActiveSessions,
        totalApiRequests,
        accountType: 'Premium'
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Application routes (authenticated)
  app.get('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getAllApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.post('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertApplicationSchema.parse(req.body);
      const application = await storage.createApplication(userId, validatedData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.get('/api/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Update application with enhanced features (PUT)
  app.put('/api/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = updateApplicationSchema.parse(req.body);
      const updatedApplication = await storage.updateApplication(applicationId, validatedData);
      
      if (!updatedApplication) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json(updatedApplication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Update application with enhanced features (PATCH)
  app.patch('/api/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = updateApplicationSchema.parse(req.body);
      const updatedApplication = await storage.updateApplication(applicationId, validatedData);
      
      if (!updatedApplication) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json(updatedApplication);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Delete application
  app.delete('/api/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      console.log("DELETE application request received for ID:", req.params.id);
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        console.log("Application not found for ID:", applicationId);
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      console.log("Checking ownership - User:", userId, "App owner:", application.userId);
      if (application.userId !== userId) {
        console.log("Access denied - user does not own application");
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("Attempting to delete application:", applicationId);
      const deleted = await storage.deleteApplication(applicationId);
      console.log("Delete result:", deleted);
      
      if (!deleted) {
        console.log("Failed to delete application");
        return res.status(404).json({ message: "Application not found" });
      }

      console.log("Application deleted successfully");
      res.json({ message: "Application deleted successfully" });
    } catch (error) {
      console.error("Error deleting application:", error);
      res.status(500).json({ message: "Failed to delete application" });
    }
  });



  // Get real-time application statistics
  app.get('/api/applications/:id/stats', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get real-time statistics
      const users = await storage.getAllAppUsers(applicationId);
      const activeSessions = await storage.getActiveSessions(applicationId);
      const recentActivity = await storage.getActivityLogs(applicationId, 100);
      
      // Calculate active users (users who are active and not paused)
      const activeUsers = users.filter(u => u.isActive && !u.isPaused).length;
      const totalUsers = users.length;
      const registeredUsers = users.filter(u => u.isActive && !u.isPaused).length;
      
      // Calculate login success rate from recent activity
      const loginAttempts = recentActivity.filter(log => log.event.includes('login'));
      const successfulLogins = loginAttempts.filter(log => log.success);
      const loginSuccessRate = loginAttempts.length > 0 ? 
        Math.round((successfulLogins.length / loginAttempts.length) * 100) : 100;

      // Get latest activity timestamp
      const lastActivity = recentActivity.length > 0 ? 
        recentActivity[recentActivity.length - 1].createdAt : null;

      res.json({
        totalUsers,
        activeUsers,
        registeredUsers,
        activeSessions: activeSessions.length,
        loginSuccessRate,
        totalApiRequests: recentActivity.length,
        lastActivity,
        applicationStatus: application.isActive ? 'online' : 'offline',
        hwidLockEnabled: application.hwidLockEnabled
      });
    } catch (error) {
      console.error("Error fetching application stats:", error);
      res.status(500).json({ message: "Failed to fetch application stats" });
    }
  });

  // Get active sessions for an application
  app.get('/api/applications/:id/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const activeSessions = await storage.getActiveSessions(applicationId);
      res.json(activeSessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  // License Key Management Routes
  
  // Get all license keys for an application
  app.get('/api/applications/:id/licenses', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const licenses = await storage.getAllLicenseKeys(applicationId);
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching license keys:", error);
      res.status(500).json({ message: "Failed to fetch license keys" });
    }
  });

  // Create a new license key
  app.post('/api/applications/:id/licenses', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertLicenseKeySchema.parse(req.body);
      const license = await storage.createLicenseKey(applicationId, validatedData);
      res.status(201).json(license);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating license key:", error);
      res.status(500).json({ message: "Failed to create license key" });
    }
  });

  // Generate a random license key (GET route for generating default values)
  app.get('/api/applications/:id/licenses/generate', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Generate a secure license key with default values
      const { nanoid } = await import('nanoid');
      const appPrefix = application.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
      const licenseKey = `${appPrefix}-${nanoid(8)}-${nanoid(8)}-${nanoid(8)}`;
      
      // Return generated key without saving it
      res.json({
        generatedKey: licenseKey,
        defaultMaxUsers: 1,
        defaultValidityDays: 30
      });
    } catch (error) {
      console.error("Error generating license key:", error);
      res.status(500).json({ message: "Failed to generate license key" });
    }
  });

  // Generate a random license key (POST route for creating)
  app.post('/api/applications/:id/licenses/generate', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { maxUsers = 1, validityDays, description } = req.body;
      
      if (!validityDays || validityDays < 1) {
        return res.status(400).json({ message: "validityDays is required and must be greater than 0" });
      }

      // Generate a secure license key
      const { nanoid } = await import('nanoid');
      const appPrefix = application.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
      const licenseKey = `${appPrefix}-${nanoid(8)}-${nanoid(8)}-${nanoid(8)}`;
      
      const license = await storage.createLicenseKey(applicationId, {
        licenseKey,
        maxUsers,
        validityDays,
        description
      });

      res.status(201).json(license);
    } catch (error) {
      console.error("Error generating license key:", error);
      res.status(500).json({ message: "Failed to generate license key" });
    }
  });

  // Delete a license key
  app.delete('/api/applications/:id/licenses/:licenseId', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const licenseId = parseInt(req.params.licenseId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const license = await storage.getLicenseKey(licenseId);
      if (!license || license.applicationId !== applicationId) {
        return res.status(404).json({ message: "License key not found" });
      }

      const deleted = await storage.deleteLicenseKey(licenseId);
      if (!deleted) {
        return res.status(404).json({ message: "License key not found" });
      }

      res.json({ message: "License key deleted successfully" });
    } catch (error) {
      console.error("Error deleting license key:", error);
      res.status(500).json({ message: "Failed to delete license key" });
    }
  });

  app.get('/api/applications/:id/users', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      console.log(`Fetching users for application ${applicationId}`);
      
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        console.log(`Application ${applicationId} not found`);
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        console.log(`Access denied for user ${userId} to application ${applicationId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getAllAppUsers(applicationId);
      console.log(`Found ${users.length} users for application ${applicationId}:`, users);
      res.json(users);
    } catch (error) {
      console.error("Error fetching application users:", error);
      res.status(500).json({ message: "Failed to fetch application users" });
    }
  });

  app.post('/api/applications/:id/users', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const userId = req.user.claims.sub;
      if (application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertAppUserSchema.parse(req.body);
      
      // Process date conversion for expiresAt and handle empty email
      const processedData: any = { ...validatedData };
      if (processedData.expiresAt && typeof processedData.expiresAt === 'string') {
        processedData.expiresAt = new Date(processedData.expiresAt);
      }
      
      // Convert empty email string to null
      if (processedData.email === '' || processedData.email === undefined) {
        processedData.email = null;
      }
      
      // Convert "none" to empty string and handle license key validation
      if (processedData.licenseKey === "none") {
        processedData.licenseKey = "";
      }
      
      // Validate license key if provided
      if (processedData.licenseKey && processedData.licenseKey.trim()) {
        const license = await storage.validateLicenseKey(processedData.licenseKey, applicationId);
        if (!license) {
          return res.status(400).json({ message: "Invalid or expired license key" });
        }
        
        // Check if license has available slots
        if (license.currentUsers >= license.maxUsers) {
          return res.status(400).json({ message: "License key has reached maximum user limit" });
        }
      }
      
      // Check for existing username/email in this application
      const existingUser = await storage.getAppUserByUsername(applicationId, validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists in this application" });
      }

      if (processedData.email) {
        const existingEmail = await storage.getAppUserByEmail(applicationId, processedData.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists in this application" });
        }
      }

      // Use createAppUserWithLicense if license key is provided, otherwise createAppUser
      const user = (processedData.licenseKey && processedData.licenseKey.trim())
        ? await storage.createAppUserWithLicense(applicationId, processedData)
        : await storage.createAppUser(applicationId, processedData);
        
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating app user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update app user
  app.put('/api/applications/:id/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const ownerId = req.user.claims.sub;
      if (application.userId !== ownerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getAppUser(userId);
      if (!user || user.applicationId !== applicationId) {
        return res.status(404).json({ message: "User not found" });
      }

      const validatedData = updateAppUserSchema.parse(req.body);
      const updatedUser = await storage.updateAppUser(userId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Don't return password in response
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating app user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Pause app user
  app.post('/api/applications/:id/users/:userId/pause', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const ownerId = req.user.claims.sub;
      if (application.userId !== ownerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getAppUser(userId);
      if (!user || user.applicationId !== applicationId) {
        return res.status(404).json({ message: "User not found" });
      }

      const paused = await storage.pauseAppUser(userId);
      if (!paused) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User paused successfully" });
    } catch (error) {
      console.error("Error pausing app user:", error);
      res.status(500).json({ message: "Failed to pause user" });
    }
  });

  // Unpause app user
  app.post('/api/applications/:id/users/:userId/unpause', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const ownerId = req.user.claims.sub;
      if (application.userId !== ownerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getAppUser(userId);
      if (!user || user.applicationId !== applicationId) {
        return res.status(404).json({ message: "User not found" });
      }

      const unpaused = await storage.unpauseAppUser(userId);
      if (!unpaused) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User unpaused successfully" });
    } catch (error) {
      console.error("Error unpausing app user:", error);
      res.status(500).json({ message: "Failed to unpause user" });
    }
  });

  // Delete app user
  app.delete('/api/applications/:id/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const ownerId = req.user.claims.sub;
      if (application.userId !== ownerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getAppUser(userId);
      if (!user || user.applicationId !== applicationId) {
        return res.status(404).json({ message: "User not found" });
      }

      const deleted = await storage.deleteAppUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting app user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Reset user HWID
  app.post('/api/applications/:id/users/:userId/reset-hwid', isAuthenticated, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user owns this application
      const ownerId = req.user.claims.sub;
      if (application.userId !== ownerId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.getAppUser(userId);
      if (!user || user.applicationId !== applicationId) {
        return res.status(404).json({ message: "User not found" });
      }

      const reset = await storage.resetAppUserHwid(userId);
      if (!reset) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "HWID reset successfully" });
    } catch (error) {
      console.error("Error resetting user HWID:", error);
      res.status(500).json({ message: "Failed to reset HWID" });
    }
  });

  // Public registration endpoint (simple license key based registration)
  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const { username, password, email, licenseKey, hwid } = req.body;
      
      if (!username || !password || !licenseKey) {
        return res.status(400).json({ 
          success: false, 
          message: "Username, password, and license key are required" 
        });
      }

      // Find license key and get associated application
      const license = await storage.getLicenseKeyByKey(licenseKey);
      if (!license) {
        return res.status(400).json({ success: false, message: "Invalid license key" });
      }

      // Validate license
      const validLicense = await storage.validateLicenseKey(licenseKey, license.applicationId);
      if (!validLicense) {
        return res.status(400).json({ success: false, message: "License key is expired or inactive" });
      }

      // Check if license has available slots
      if (license.currentUsers >= license.maxUsers) {
        return res.status(400).json({ success: false, message: "License key has reached maximum user limit" });
      }

      // Check for existing user
      const existingUser = await storage.getAppUserByUsername(license.applicationId, username);
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Username already exists" });
      }

      if (email) {
        const existingEmail = await storage.getAppUserByEmail(license.applicationId, email);
        if (existingEmail) {
          return res.status(400).json({ success: false, message: "Email already exists" });
        }
      }

      // Create user with license
      const userData = {
        username,
        password,
        email: email || null,
        licenseKey,
        hwid: hwid || null,
        expiresAt: license.expiresAt.toISOString()
      };

      const user = await storage.createAppUserWithLicense(license.applicationId, userData);
      
      res.status(201).json({ 
        success: true, 
        message: "User registered successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          expiresAt: user.expiresAt,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ success: false, message: "Registration failed" });
    }
  });

  // External API routes (require API key)

  // Enhanced Login via API with version checking, HWID locking, blacklist checking, and webhook notifications
  app.post('/api/v1/login', validateApiKey, async (req: any, res) => {
    try {
      const application = req.application;
      const validatedData = loginSchema.parse(req.body);
      const { username, password, version, hwid } = validatedData;
      
      // Get client info
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      console.log(`Login attempt - Username: ${username}, IP: ${ipAddress}, Version: ${version}, HWID: ${hwid ? hwid.substring(0, 8) + '...' : 'none'}`);

      // Check blacklist - IP address
      if (ipAddress) {
        const ipBlacklist = await storage.checkBlacklist(application.id, 'ip', ipAddress);
        if (ipBlacklist) {
          await webhookService.logAndNotify(
            application.userId,
            application.id,
            'login_blocked_ip',
            { username },
            { 
              success: false, 
              errorMessage: `Login blocked: IP ${ipAddress} is blacklisted - ${ipBlacklist.reason || 'No reason provided'}`,
              ipAddress,
              userAgent,
              hwid
            }
          );
          
          return res.status(403).json({ 
            success: false, 
            message: "Access denied: IP address is blacklisted"
          });
        }
      }

      // Check blacklist - Username
      const usernameBlacklist = await storage.checkBlacklist(application.id, 'username', username);
      if (usernameBlacklist) {
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'login_blocked_username',
          { username },
          { 
            success: false, 
            errorMessage: `Login blocked: Username ${username} is blacklisted - ${usernameBlacklist.reason || 'No reason provided'}`,
            ipAddress,
            userAgent,
            hwid
          }
        );
        
        return res.status(403).json({ 
          success: false, 
          message: "Access denied: Username is blacklisted"
        });
      }

      // Check blacklist - HWID
      if (hwid) {
        const hwidBlacklist = await storage.checkBlacklist(application.id, 'hwid', hwid);
        if (hwidBlacklist) {
          await webhookService.logAndNotify(
            application.userId,
            application.id,
            'login_blocked_hwid',
            { username },
            { 
              success: false, 
              errorMessage: `Login blocked: HWID ${hwid} is blacklisted - ${hwidBlacklist.reason || 'No reason provided'}`,
              ipAddress,
              userAgent,
              hwid
            }
          );
          
          return res.status(403).json({ 
            success: false, 
            message: "Access denied: Hardware ID is blacklisted"
          });
        }
      }

      // Check application version if provided
      if (version && version !== application.version) {
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'version_mismatch',
          { username },
          { 
            success: false, 
            errorMessage: `Version mismatch: Required ${application.version}, provided ${version}`,
            ipAddress,
            userAgent,
            hwid,
            metadata: { required_version: application.version, current_version: version }
          }
        );
        
        return res.status(400).json({ 
          success: false, 
          message: application.versionMismatchMessage || "Please update your application to the latest version!",
          required_version: application.version,
          current_version: version
        });
      }

      const user = await storage.getAppUserByUsername(application.id, username);
      if (!user) {
        // Send failed login webhook notification for non-existent user
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'login_failed',
          { username },
          { 
            success: false, 
            errorMessage: "User not found",
            ipAddress,
            userAgent,
            hwid,
            metadata: {
              reason: "non_existent_user",
              attempt_time: new Date().toISOString()
            }
          }
        );
        
        return res.status(401).json({ 
          success: false, 
          message: application.loginFailedMessage || "Invalid credentials!" 
        });
      }

      // Check if user is active
      if (!user.isActive) {
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'account_disabled',
          user,
          { 
            success: false, 
            errorMessage: "Account is disabled",
            ipAddress,
            userAgent,
            hwid
          }
        );
        
        return res.status(401).json({ 
          success: false, 
          message: application.accountDisabledMessage || "Account is disabled!" 
        });
      }

      // Check if user is paused
      if (user.isPaused) {
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'account_disabled',
          user,
          { 
            success: false, 
            errorMessage: "Account is temporarily paused",
            ipAddress,
            userAgent,
            hwid
          }
        );
        
        return res.status(401).json({ 
          success: false, 
          message: "Account is temporarily paused. Contact support." 
        });
      }

      // Check expiration
      if (user.expiresAt && new Date() > user.expiresAt) {
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'account_expired',
          user,
          { 
            success: false, 
            errorMessage: "Account has expired",
            ipAddress,
            userAgent,
            hwid,
            metadata: {
              expired_at: user.expiresAt.toISOString()
            }
          }
        );
        
        return res.status(401).json({ 
          success: false, 
          message: application.accountExpiredMessage || "Account has expired!" 
        });
      }

      // Validate password
      const isValidPassword = await storage.validatePassword(password, user.password);
      if (!isValidPassword) {
        // Increment login attempts
        await storage.updateAppUser(user.id, { 
          loginAttempts: user.loginAttempts + 1,
          lastLoginAttempt: new Date()
        });
        
        // Send failed login webhook notification
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'login_failed',
          user,
          { 
            success: false, 
            errorMessage: "Invalid password provided",
            ipAddress,
            userAgent,
            hwid,
            metadata: {
              login_attempts: user.loginAttempts + 1,
              attempt_time: new Date().toISOString()
            }
          }
        );
        
        return res.status(401).json({ 
          success: false, 
          message: application.loginFailedMessage || "Invalid credentials!" 
        });
      }

      // HWID Lock Check
      if (application.hwidLockEnabled) {
        if (!hwid) {
          return res.status(400).json({ 
            success: false, 
            message: "Hardware ID is required for this application" 
          });
        }

        // If user has no HWID set, set it on first login
        if (!user.hwid) {
          await storage.updateAppUser(user.id, { hwid });
        } else if (user.hwid !== hwid) {
          // HWID mismatch - send webhook notification
          await webhookService.logAndNotify(
            application.userId,
            application.id,
            'hwid_mismatch',
            user,
            { 
              success: false, 
              errorMessage: `HWID mismatch: Expected ${user.hwid}, got ${hwid}`,
              ipAddress,
              userAgent,
              hwid,
              metadata: {
                expected_hwid: user.hwid,
                provided_hwid: hwid
              }
            }
          );
          
          return res.status(401).json({ 
            success: false, 
            message: application.hwidMismatchMessage || "Hardware ID mismatch detected!" 
          });
        }
      }

      // Reset login attempts on successful login and update last login
      await storage.updateAppUser(user.id, { 
        lastLogin: new Date(),
        loginAttempts: 0,
        lastLoginAttempt: new Date()
      });

      // Send successful login webhook notification
      await webhookService.logAndNotify(
        application.userId,
        application.id,
        'user_login',
        user,
        { 
          success: true, 
          ipAddress,
          userAgent,
          hwid,
          metadata: {
            login_time: new Date().toISOString(),
            version: version,
            hwid_locked: application.hwidLockEnabled && !!user.hwid
          }
        }
      );

      // Success response with custom message
      res.json({ 
        success: true, 
        message: application.loginSuccessMessage || "Login successful!",
        user_id: user.id,
        username: user.username,
        email: user.email,
        expires_at: user.expiresAt,
        hwid_locked: application.hwidLockEnabled && !!user.hwid
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: "Invalid request data", errors: error.errors });
      }
      console.error("Error during login:", error);
      res.status(500).json({ success: false, message: "Login failed" });
    }
  });

  // Register user with license key validation via API
  app.post('/api/v1/register', validateApiKey, async (req: any, res) => {
    try {
      const application = req.application;
      const { username, password, email, license_key, version, hwid } = req.body;
      
      console.log('Register request body:', { username, password: password ? '[HIDDEN]' : undefined, email, license_key, version, hwid });
      
      if (!username || !password || !license_key) {
        console.log('Missing required fields:', { username: !!username, password: !!password, license_key: !!license_key });
        return res.status(400).json({ 
          success: false, 
          message: "Username, password, and license key are required" 
        });
      }

      // Validate license key
      const license = await storage.validateLicenseKey(license_key, application.id);
      if (!license) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or expired license key" 
        });
      }
      
      // Check if license has available slots
      if (license.currentUsers >= license.maxUsers) {
        return res.status(400).json({ 
          success: false, 
          message: "License key has reached maximum user limit" 
        });
      }

      // Check for existing username in this application
      const existingUser = await storage.getAppUserByUsername(application.id, username);
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: "Username already exists" 
        });
      }

      // Check for existing email if provided
      if (email) {
        const existingEmail = await storage.getAppUserByEmail(application.id, email);
        if (existingEmail) {
          return res.status(400).json({ 
            success: false, 
            message: "Email already exists" 
          });
        }
      }

      // Create user with license key association
      const userData = {
        username,
        password,
        email: email || null,
        licenseKey: license_key,
        hwid: hwid || null
      };

      const user = await storage.createAppUserWithLicense(application.id, userData);

      // Send registration webhook notification
      await webhookService.logAndNotify(
        application.userId,
        application.id,
        'user_registration',
        user,
        { 
          success: true, 
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          hwid,
          metadata: {
            registration_time: new Date().toISOString(),
            license_key: license_key,
            version: version
          }
        }
      );

      // Success response
      res.json({ 
        success: true, 
        message: "Registration successful! You can now login with your credentials.",
        user_id: user.id,
        username: user.username,
        email: user.email,
        expires_at: user.expiresAt
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ success: false, message: "Registration failed" });
    }
  });

  // Verify user session via API
  app.post('/api/v1/verify', validateApiKey, async (req: any, res) => {
    try {
      const application = req.application;
      const { user_id } = req.body;
      
      if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID required" });
      }

      const user = await storage.getAppUser(user_id);
      if (!user || user.applicationId !== application.id) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (!user.isActive) {
        return res.status(401).json({ success: false, message: "Account is disabled" });
      }

      if (user.isPaused) {
        return res.status(401).json({ success: false, message: "Account is temporarily paused" });
      }

      // Check expiration
      if (user.expiresAt && new Date() > user.expiresAt) {
        return res.status(401).json({ success: false, message: "Account has expired" });
      }

      res.json({ 
        success: true, 
        message: "User verified",
        user_id: user.id,
        username: user.username,
        email: user.email,
        expires_at: user.expiresAt
      });
    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ success: false, message: "Verification failed" });
    }
  });

  // Session tracking endpoint for active session management
  app.post('/api/v1/session/track', validateApiKey, async (req: any, res) => {
    try {
      const application = req.application;
      const { user_id, session_token, action } = req.body;
      
      if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID required" });
      }

      const user = await storage.getAppUser(user_id);
      if (!user || user.applicationId !== application.id) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Create or update session based on action
      if (action === 'start' && session_token) {
        // Create new session
        await storage.createActiveSession({
          applicationId: application.id,
          appUserId: user.id,
          sessionToken: session_token,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'] || '',
          location: null,
          hwid: null,
          expiresAt: null,
          isActive: true
        });

        // Log session start activity
        await webhookService.logAndNotify(
          application.userId,
          application.id,
          'session_start',
          user,
          { 
            success: true, 
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            metadata: {
              session_token: session_token,
              session_start_time: new Date().toISOString()
            }
          }
        );

        res.json({ 
          success: true, 
          message: "Session started",
          session_token: session_token
        });
      } 
      else if (action === 'heartbeat' && session_token) {
        // Update session activity
        const updated = await storage.updateSessionActivity(session_token);
        
        res.json({ 
          success: updated, 
          message: updated ? "Session updated" : "Session not found"
        });
      }
      else if (action === 'end' && session_token) {
        // End session
        const ended = await storage.endSession(session_token);
        
        // Log session end activity
        if (ended) {
          await webhookService.logAndNotify(
            application.userId,
            application.id,
            'session_end',
            user,
            { 
              success: true, 
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.headers['user-agent'],
              metadata: {
                session_token: session_token,
                session_end_time: new Date().toISOString()
              }
            }
          );
        }

        res.json({ 
          success: ended, 
          message: ended ? "Session ended" : "Session not found"
        });
      }
      else {
        res.status(400).json({ success: false, message: "Invalid action or missing session_token" });
      }
    } catch (error) {
      console.error("Error tracking session:", error);
      res.status(500).json({ success: false, message: "Session tracking failed" });
    }
  });

  // Webhook routes
  app.get('/api/webhooks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const webhooks = await storage.getUserWebhooks(userId);
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ message: "Failed to fetch webhooks" });
    }
  });

  app.post('/api/webhooks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertWebhookSchema.parse(req.body);
      
      // Validate webhook URL format
      try {
        const url = new URL(validatedData.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return res.status(400).json({ message: "Webhook URL must use HTTP or HTTPS protocol" });
        }
      } catch (urlError) {
        return res.status(400).json({ message: "Invalid webhook URL format" });
      }
      
      // Test webhook endpoint before creating
      try {
        console.log(`Testing webhook URL: ${validatedData.url}`);
        const isDiscordWebhook = validatedData.url.includes('discord.com/api/webhooks');
        
        let testPayload;
        if (isDiscordWebhook) {
          // Use Discord-compatible format for validation with content field
          testPayload = {
            content: "PhantomAuth Webhook Validation Complete",
            embeds: [{
              title: "✅ PhantomAuth Webhook Validation",
              description: "This webhook endpoint has been successfully validated and registered with PhantomAuth.",
              color: 0x00ff00,
              fields: [
                {
                  name: "Status",
                  value: "Webhook endpoint validated",
                  inline: true
                },
                {
                  name: "Server",
                  value: "Vietnam/India Optimized",
                  inline: true
                },
                {
                  name: "Connection Time",
                  value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                  inline: false
                }
              ],
              footer: {
                text: "PhantomAuth - Webhook Validation System"
              },
              timestamp: new Date().toISOString()
            }]
          };
        } else {
          testPayload = {
            test: true,
            message: "Webhook endpoint validation test",
            timestamp: new Date().toISOString()
          };
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout for India-Vietnam

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'PhantomAuth-WebhookValidator/1.0',
          'Accept': 'application/json, text/plain, */*',
          'Connection': 'keep-alive'
        };

        const response = await fetch(validatedData.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(testPayload),
          signal: controller.signal,
          keepalive: true,
          mode: 'cors'
        });

        clearTimeout(timeoutId);

        // For Discord webhooks, 204 is success, for others check if HTML response
        if (isDiscordWebhook) {
          if (response.status === 204 || response.status === 200) {
            console.log(`Discord webhook validation successful: Status ${response.status}`);
          } else {
            const responseText = await response.text().catch(() => '');
            return res.status(400).json({ 
              message: "Discord webhook validation failed. Please verify the webhook URL is correct.",
              details: `Status: ${response.status}, Response: ${responseText.substring(0, 200)}`
            });
          }
        } else {
          // Check if response is HTML (common error)
          const contentType = response.headers.get('content-type') || '';
          const responseText = await response.text();
          
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
            return res.status(400).json({ 
              message: "Webhook endpoint returned HTML instead of accepting JSON. Please verify the URL accepts POST requests with JSON payloads.",
              details: `Status: ${response.status}, Content-Type: ${contentType}`
            });
          }
        }

        console.log(`Webhook test completed: Status ${response.status}`);
        
      } catch (testError) {
        const errorMessage = testError instanceof Error ? testError.message : String(testError);
        
        // Allow creation if it's just a timeout or network issue, but warn the user
        if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
          console.log(`Webhook URL test timed out, but allowing creation: ${validatedData.url}`);
        } else {
          return res.status(400).json({ 
            message: "Webhook endpoint test failed. Please verify the URL is accessible and accepts POST requests.",
            error: errorMessage
          });
        }
      }
      
      const webhook = await storage.createWebhook(userId, validatedData);
      res.status(201).json(webhook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating webhook:", error);
      res.status(500).json({ message: "Failed to create webhook" });
    }
  });

  app.put('/api/webhooks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const validatedData = insertWebhookSchema.partial().parse(req.body);
      
      // Check ownership
      const webhooks = await storage.getUserWebhooks(userId);
      const webhook = webhooks.find(w => w.id === webhookId);
      
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const updatedWebhook = await storage.updateWebhook(webhookId, validatedData);
      if (!updatedWebhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      res.json(updatedWebhook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error updating webhook:", error);
      res.status(500).json({ message: "Failed to update webhook" });
    }
  });

  app.delete('/api/webhooks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const webhookId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check ownership
      const webhooks = await storage.getUserWebhooks(userId);
      const webhook = webhooks.find(w => w.id === webhookId);
      
      if (!webhook) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      const deleted = await storage.deleteWebhook(webhookId);
      if (!deleted) {
        return res.status(404).json({ message: "Webhook not found" });
      }

      res.json({ message: "Webhook deleted successfully" });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ message: "Failed to delete webhook" });
    }
  });

  // Blacklist routes
  app.get('/api/blacklist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getAllApplications(userId);
      
      // Get blacklist entries for all user's applications plus global entries
      const applicationIds = applications.map(app => app.id);
      const blacklistEntries = await storage.getBlacklistEntries();
      
      // Filter to show only entries that belong to user's applications or are global
      const filteredEntries = blacklistEntries.filter(entry => 
        !entry.applicationId || applicationIds.includes(entry.applicationId)
      );

      res.json(filteredEntries);
    } catch (error) {
      console.error("Error fetching blacklist:", error);
      res.status(500).json({ message: "Failed to fetch blacklist" });
    }
  });

  app.post('/api/blacklist', isAuthenticated, async (req: any, res) => {
    try {
      console.log('Blacklist POST - req.user:', req.user);
      console.log('Blacklist POST - req.session:', req.session);
      console.log('Blacklist POST - req.body:', req.body);
      
      const userId = req.user.claims.sub;
      const validatedData = insertBlacklistSchema.parse(req.body);
      
      // If applicationId is provided, verify user owns that application
      if (validatedData.applicationId) {
        const application = await storage.getApplication(validatedData.applicationId);
        if (!application || application.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const blacklistEntry = await storage.createBlacklistEntry(validatedData);
      res.status(201).json(blacklistEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error creating blacklist entry:", error);
      res.status(500).json({ message: "Failed to create blacklist entry" });
    }
  });

  app.delete('/api/blacklist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Get the blacklist entry and verify ownership
      const blacklistEntries = await storage.getBlacklistEntries();
      const entry = blacklistEntries.find(e => e.id === entryId);
      
      if (!entry) {
        return res.status(404).json({ message: "Blacklist entry not found" });
      }

      // Check if user owns the application (if it's not a global entry)
      if (entry.applicationId) {
        const application = await storage.getApplication(entry.applicationId);
        if (!application || application.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const deleted = await storage.deleteBlacklistEntry(entryId);
      if (!deleted) {
        return res.status(404).json({ message: "Blacklist entry not found" });
      }

      res.json({ message: "Blacklist entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting blacklist entry:", error);
      res.status(500).json({ message: "Failed to delete blacklist entry" });
    }
  });

  // Activity logs routes
  app.get('/api/activity-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applicationId = req.query.applicationId;
      
      if (applicationId) {
        // Get logs for specific application
        const application = await storage.getApplication(parseInt(applicationId));
        if (!application || application.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        const logs = await storage.getActivityLogs(parseInt(applicationId));
        res.json(logs);
      } else {
        // Get logs for all user's applications
        const applications = await storage.getAllApplications(userId);
        const allLogs = [];
        
        for (const app of applications) {
          const logs = await storage.getActivityLogs(app.id);
          allLogs.push(...logs);
        }
        
        // Sort by creation date (newest first)
        allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        res.json(allLogs);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  // Get activity logs for specific user
  app.get('/api/activity-logs/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appUserId = parseInt(req.params.userId);
      
      // Get the app user and verify ownership
      const appUser = await storage.getAppUser(appUserId);
      if (!appUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const application = await storage.getApplication(appUser.applicationId);
      if (!application || application.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const logs = await storage.getUserActivityLogs(appUserId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching user activity logs:", error);
      res.status(500).json({ message: "Failed to fetch user activity logs" });
    }
  });

  // Test webhook endpoint
  app.post('/api/test-webhook', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getAllApplications(userId);
      
      if (applications.length === 0) {
        return res.status(400).json({ message: "No applications found. Create an application first." });
      }

      const application = applications[0]; // Use the first application for testing
      const { event = 'user_login' } = req.body;
      
      // Test different webhook events
      const testEvents = {
        'user_login': {
          success: true,
          userData: { id: 1, username: 'test_user', email: 'test@example.com' },
          options: { ipAddress: req.ip, userAgent: req.headers['user-agent'], hwid: 'TEST-HWID' }
        },
        'login_failed': {
          success: false,
          userData: { id: 1, username: 'test_user', email: 'test@example.com' },
          options: { success: false, errorMessage: 'Invalid password', ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'user_register': {
          success: true,
          userData: { id: 2, username: 'new_user', email: 'new@example.com' },
          options: { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'account_disabled': {
          success: false,
          userData: { id: 1, username: 'disabled_user', email: 'disabled@example.com' },
          options: { success: false, errorMessage: 'Account is disabled', ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'account_expired': {
          success: false,
          userData: { id: 1, username: 'expired_user', email: 'expired@example.com' },
          options: { success: false, errorMessage: 'Account has expired', ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'version_mismatch': {
          success: false,
          userData: { id: 1, username: 'test_user', email: 'test@example.com' },
          options: { success: false, errorMessage: 'Version mismatch detected', ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'hwid_mismatch': {
          success: false,
          userData: { id: 1, username: 'test_user', email: 'test@example.com' },
          options: { success: false, errorMessage: 'Hardware ID mismatch', ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'login_blocked_ip': {
          success: false,
          userData: { username: 'test_user' },
          options: { success: false, errorMessage: 'IP address is blacklisted', ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'login_blocked_username': {
          success: false,
          userData: { username: 'blocked_user' },
          options: { success: false, errorMessage: 'Username is blacklisted', ipAddress: req.ip, userAgent: req.headers['user-agent'] }
        },
        'login_blocked_hwid': {
          success: false,
          userData: { username: 'test_user' },
          options: { success: false, errorMessage: 'Hardware ID is blacklisted', ipAddress: req.ip, userAgent: req.headers['user-agent'], hwid: 'BLOCKED-HWID' }
        }
      };

      const testData = testEvents[event as keyof typeof testEvents] || testEvents['user_login'];
      
      // Send test webhook notification
      await webhookService.logAndNotify(
        userId,
        application.id,
        event,
        testData.userData,
        testData.options
      );

      res.json({ 
        success: true, 
        message: `Test webhook sent for event: ${event}`,
        application_id: application.id
      });
    } catch (error) {
      console.error("Error sending test webhook:", error);
      res.status(500).json({ message: "Failed to send test webhook" });
    }
  });

  // Enhanced webhook diagnostics endpoint for Vietnam server optimization
  app.post('/api/webhook-diagnostics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { webhook_url, test_type = 'basic' } = req.body;
      
      if (!webhook_url) {
        return res.status(400).json({ message: "Webhook URL is required" });
      }

      const serverInfo = {
        region: process.env.REPLIT_DEPLOYMENT_REGION || "unknown",
        timestamp: new Date().toISOString(),
        nodejs_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      };

      const requestInfo = {
        client_ip: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'],
        country: req.headers['cf-ipcountry'] || "unknown",
        forwarded_for: req.headers['x-forwarded-for'],
        cloudflare_ray: req.headers['cf-ray'],
        accept_language: req.headers['accept-language'],
        connection_type: req.headers['connection'],
        via_header: req.headers['via']
      };

      console.log(`Starting webhook diagnostics for: ${webhook_url}`);
      console.log(`Test type: ${test_type}, Server region: ${serverInfo.region}`);

      const diagnostics = {
        server_info: serverInfo,
        request_info: requestInfo,
        connectivity_tests: [] as any[],
        performance_metrics: {} as any,
        recommendations: [] as string[]
      };

      // Multiple connectivity tests optimized for India-Vietnam connectivity
      const isDiscordWebhook = webhook_url.includes('discord.com/api/webhooks');
      
      const testConfigs = [
        { name: 'Basic Test', timeout: 20000, retry: false },
        { name: 'Extended Timeout', timeout: 60000, retry: false },
        { name: 'With Retry Logic', timeout: 45000, retry: true }
      ];

      if (test_type === 'comprehensive') {
        testConfigs.push(
          { name: 'High Latency Test', timeout: 90000, retry: true },
          { name: 'Quick Test', timeout: 10000, retry: false }
        );
      }

      // For Discord webhooks, add rate limiting delays
      let discordDelay = 0;

      for (const config of testConfigs) {
        // Add delay for Discord webhooks to respect rate limits
        if (isDiscordWebhook && discordDelay > 0) {
          console.log(`Waiting ${discordDelay}ms to respect Discord rate limits...`);
          await new Promise(resolve => setTimeout(resolve, discordDelay));
        }
        
        const testStart = Date.now();
        let testResult: any = {
          test_name: config.name,
          success: false,
          status_code: 0,
          response_time_ms: 0,
          response_headers: {},
          error: null,
          retry_attempts: 0
        };

        try {
          console.log(`Running ${config.name} for ${webhook_url}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), config.timeout);

          // Check if this is a Discord webhook and format payload accordingly
          const isDiscordWebhook = webhook_url.includes('discord.com/api/webhooks');
          
          let testPayload;
          if (isDiscordWebhook) {
            // Discord webhook format with content field to avoid empty message error
            testPayload = {
              content: `PhantomAuth Connectivity Test - ${config.name}`,
              embeds: [{
                title: "🔧 PhantomAuth Connectivity Test",
                description: `Testing webhook connectivity from ${serverInfo.region || 'Vietnam'} server to India`,
                color: 0x00ff00,
                fields: [
                  {
                    name: "Test Type",
                    value: config.name,
                    inline: true
                  },
                  {
                    name: "Server Region",
                    value: serverInfo.region || "Vietnam/Unknown",
                    inline: true
                  },
                  {
                    name: "Response Time Target",
                    value: "< 2 seconds optimal",
                    inline: true
                  },
                  {
                    name: "Test Time",
                    value: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    inline: false
                  }
                ],
                footer: {
                  text: "PhantomAuth Webhook Diagnostics - India Vietnam Connectivity"
                },
                timestamp: new Date().toISOString()
              }]
            };
          } else {
            // Standard webhook format
            testPayload = {
              test: true,
              test_type: config.name,
              message: "Vietnam Server Connectivity Test from PhantomAuth",
              timestamp: new Date().toISOString(),
              server_diagnostics: serverInfo,
              client_info: requestInfo
            };
          }

          let attempt = 0;
          let lastError = null;

          do {
            attempt++;
            const attemptStart = Date.now();
            
            try {
              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'User-Agent': 'PhantomAuth-IndiaVietnamDiagnostics/1.0',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'X-Server-Region': serverInfo.region || 'Vietnam',
                'X-Client-Country': 'India',
                'X-Test-Type': config.name,
                'X-Attempt': attempt.toString()
              };

              // Don't add custom headers for Discord webhooks
              if (!isDiscordWebhook) {
                headers['X-Webhook-Test'] = 'true';
                headers['X-PhantomAuth-Diagnostics'] = '1.0';
              }

              const response = await fetch(webhook_url, {
                method: 'POST',
                headers,
                body: JSON.stringify(testPayload),
                signal: controller.signal,
                // Optimize for India-Vietnam connectivity
                keepalive: true,
                mode: 'cors',
                cache: 'no-cache',
                redirect: 'follow',
                referrerPolicy: 'no-referrer'
              });

              clearTimeout(timeoutId);
              const responseTime = Date.now() - attemptStart;

              testResult = {
                ...testResult,
                success: response.ok,
                status_code: response.status,
                response_time_ms: responseTime,
                response_headers: Object.fromEntries(response.headers.entries()),
                retry_attempts: attempt - 1
              };

              if (!response.ok) {
                try {
                  const contentType = response.headers.get('content-type') || '';
                  const responseText = await response.text();
                  
                  // Check if response is HTML (common error indicator)
                  if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
                    testResult.error = `Webhook endpoint returned HTML page instead of JSON. This usually means the URL is incorrect or doesn't accept POST requests. Status: ${response.status}`;
                  } else if (contentType.includes('application/json')) {
                    try {
                      const jsonError = JSON.parse(responseText);
                      testResult.error = JSON.stringify(jsonError);
                    } catch (jsonParseError) {
                      testResult.error = `Invalid JSON response: ${responseText.substring(0, 200)}...`;
                    }
                  } else {
                    testResult.error = `Non-JSON response (${contentType}): ${responseText.substring(0, 200)}...`;
                  }
                } catch (e) {
                  testResult.error = `HTTP ${response.status} - Unable to read response`;
                }
              } else {
                console.log(`✅ ${config.name} successful in ${responseTime}ms`);
                // For Discord webhooks, record success and increase delay for next test
                if (isDiscordWebhook) {
                  discordDelay = Math.max(2000, discordDelay); // Minimum 2 second delay between tests
                }
                break; // Success, exit retry loop
              }

            } catch (error) {
              clearTimeout(timeoutId);
              const responseTime = Date.now() - attemptStart;
              lastError = error;
              
              testResult = {
                ...testResult,
                response_time_ms: responseTime,
                error: error instanceof Error ? error.message : String(error),
                retry_attempts: attempt - 1
              };

              console.log(`❌ ${config.name} attempt ${attempt} failed: ${testResult.error}`);
            }
          } while (config.retry && attempt < 3 && !testResult.success);

          // Handle Discord rate limiting
          if (isDiscordWebhook && testResult.status_code === 429) {
            discordDelay = Math.min(discordDelay * 2, 30000); // Exponential backoff, max 30 seconds
            testResult.error = `Discord rate limit hit. Increasing delay to ${discordDelay}ms for subsequent tests.`;
          } else if (isDiscordWebhook && testResult.success) {
            discordDelay = Math.max(1000, discordDelay / 2); // Reduce delay on success
          }

          if (!testResult.success && lastError) {
            testResult.error = lastError instanceof Error ? lastError.message : String(lastError);
          }

        } catch (error) {
          const responseTime = Date.now() - testStart;
          testResult = {
            ...testResult,
            response_time_ms: responseTime,
            error: error instanceof Error ? error.message : String(error)
          };
        }

        diagnostics.connectivity_tests.push(testResult);
        
        // Add intelligent delay between tests
        const configIndex = testConfigs.indexOf(config);
        if (configIndex < testConfigs.length - 1) {
          let delayTime = 2000; // Base 2 second delay
          
          if (isDiscordWebhook) {
            delayTime = Math.max(3000, discordDelay); // Minimum 3 seconds for Discord
            console.log(`Discord webhook detected - using ${delayTime}ms delay between tests`);
          }
          
          console.log(`Waiting ${delayTime}ms before next test...`);
          await new Promise(resolve => setTimeout(resolve, delayTime));
        }
      }

      // Performance analysis
      const successfulTests = diagnostics.connectivity_tests.filter(t => t.success);
      const failedTests = diagnostics.connectivity_tests.filter(t => !t.success);
      
      if (successfulTests.length > 0) {
        const responseTimes = successfulTests.map(t => t.response_time_ms);
        diagnostics.performance_metrics = {
          avg_response_time: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
          min_response_time: Math.min(...responseTimes),
          max_response_time: Math.max(...responseTimes),
          success_rate: Math.round((successfulTests.length / diagnostics.connectivity_tests.length) * 100)
        };
      }

      // Generate recommendations based on test results
      if (failedTests.length > 0) {
        diagnostics.recommendations.push("Some connectivity tests failed. Consider checking your webhook endpoint.");
      }
      
      if (diagnostics.performance_metrics.avg_response_time > 10000) {
        diagnostics.recommendations.push("High response times detected. Consider optimizing your webhook endpoint or using a CDN.");
      }
      
      if (diagnostics.performance_metrics.success_rate < 100) {
        diagnostics.recommendations.push("Intermittent failures detected. Consider implementing retry logic in your webhook endpoint.");
      }

      if (successfulTests.length === 0) {
        diagnostics.recommendations.push("All connectivity tests failed. Please verify your webhook URL and endpoint availability.");
      } else {
        diagnostics.recommendations.push("Webhook endpoint is reachable from Vietnam server.");
      }

      console.log(`Webhook diagnostics completed: ${successfulTests.length}/${diagnostics.connectivity_tests.length} tests passed`);

      res.json({
        success: true,
        message: "Enhanced webhook diagnostics completed",
        diagnostics,
        summary: {
          total_tests: diagnostics.connectivity_tests.length,
          successful_tests: successfulTests.length,
          failed_tests: failedTests.length,
          overall_status: successfulTests.length > 0 ? 'WORKING' : 'FAILED'
        }
      });

    } catch (error) {
      console.error("Error running webhook diagnostics:", error);
      
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle specific JSON parsing errors
      if (errorMessage.includes("Unexpected token") && errorMessage.includes("<!DOCTYPE")) {
        errorMessage = "Webhook endpoint returned HTML page instead of JSON. This usually means the URL is incorrect or doesn't accept POST requests with JSON payloads.";
      } else if (errorMessage.includes("Unexpected token")) {
        errorMessage = "Webhook endpoint returned invalid JSON response. Please verify the endpoint accepts JSON and returns valid responses.";
      }
      
      res.status(500).json({ 
        success: false,
        message: "Failed to run diagnostics",
        error: errorMessage,
        diagnostics: {
          connectivity_tests: [{
            test_name: "Initial Connection",
            success: false,
            error: errorMessage,
            status_code: 0,
            response_time_ms: 0
          }]
        },
        summary: {
          total_tests: 1,
          successful_tests: 0,
          failed_tests: 1,
          overall_status: 'FAILED'
        }
      });
    }
  });

  // Admin routes for user management - temporarily bypass auth for debugging
  app.get('/api/admin/users', async (req: any, res) => {
    try {
      console.log("Admin users endpoint - fetching all users");
      const users = await storage.getAllUsers();
      console.log(`Found ${users.length} users`);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:userId', isAuthenticated, requirePermission(PERMISSIONS.MANAGE_PERMISSIONS), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role, permissions, isActive } = req.body;
      
      // Only owner can modify other users
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'owner' && userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Only the owner can modify other users" });
      }

      // Update user permissions
      const updatedUser = await storage.updateUser(userId, { role, permissions, isActive });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/admin/users/:userId', isAuthenticated, requireRole(ROLES.OWNER), async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Prevent self-deletion
      if (userId === req.user.claims.sub) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Delete the user
      const deleted = await storage.deleteUser(userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}