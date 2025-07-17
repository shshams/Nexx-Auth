import mongoose from 'mongoose';
import { z } from 'zod';

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  role: { type: String, default: 'user' }, // 'owner', 'admin', 'moderator', 'user'
  permissions: { type: [String], default: [] }, // Array of specific permissions
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Application Schema
const applicationSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true },
  description: String,
  apiKey: { type: String, required: true, unique: true },
  version: { type: String, default: '1.0.0' },
  isActive: { type: Boolean, default: true },
  hwidLockEnabled: { type: Boolean, default: false },
  // Custom messages for different scenarios
  loginSuccessMessage: { type: String, default: 'Login successful!' },
  loginFailedMessage: { type: String, default: 'Invalid credentials!' },
  accountDisabledMessage: { type: String, default: 'Account is disabled!' },
  accountExpiredMessage: { type: String, default: 'Account has expired!' },
  versionMismatchMessage: { type: String, default: 'Please update your application to the latest version!' },
  hwidMismatchMessage: { type: String, default: 'Hardware ID mismatch detected!' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// License Key Schema
const licenseKeySchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Application' },
  licenseKey: { type: String, required: true, unique: true },
  maxUsers: { type: Number, default: 1 },
  currentUsers: { type: Number, default: 0 },
  validityDays: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// App User Schema
const appUserSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Application' },
  username: { type: String, required: true },
  email: String,
  password: { type: String, required: true },
  hwid: String,
  isActive: { type: Boolean, default: true },
  role: { type: String, default: 'user' },
  permissions: { type: [String], default: [] },
  expiresAt: Date,
  licenseKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'LicenseKey' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Webhook Schema
const webhookSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  name: { type: String, required: true },
  url: { type: String, required: true },
  secret: String,
  isActive: { type: Boolean, default: true },
  events: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Blacklist Schema
const blacklistSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Application' },
  type: { type: String, required: true }, // 'ip', 'username', 'email', 'hwid'
  value: { type: String, required: true },
  reason: String,
  createdAt: { type: Date, default: Date.now },
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Application' },
  appUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppUser' },
  action: { type: String, required: true },
  ipAddress: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

// Active Session Schema
const activeSessionSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Application' },
  appUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'AppUser' },
  sessionToken: { type: String, required: true, unique: true },
  ipAddress: String,
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
});

// Add compound indexes for efficient queries
userSchema.index({ email: 1 });
applicationSchema.index({ userId: 1 });
applicationSchema.index({ apiKey: 1 });
appUserSchema.index({ applicationId: 1, username: 1 }, { unique: true });
appUserSchema.index({ applicationId: 1, email: 1 }, { unique: true, sparse: true });
licenseKeySchema.index({ applicationId: 1 });
licenseKeySchema.index({ licenseKey: 1 });
webhookSchema.index({ userId: 1 });
blacklistSchema.index({ applicationId: 1, type: 1, value: 1 });
activityLogSchema.index({ applicationId: 1, createdAt: -1 });
activeSessionSchema.index({ applicationId: 1 });
activeSessionSchema.index({ sessionToken: 1 });

// Export Models
export const User = mongoose.model('User', userSchema);
export const Application = mongoose.model('Application', applicationSchema);
export const LicenseKey = mongoose.model('LicenseKey', licenseKeySchema);
export const AppUser = mongoose.model('AppUser', appUserSchema);
export const Webhook = mongoose.model('Webhook', webhookSchema);
export const BlacklistEntry = mongoose.model('BlacklistEntry', blacklistSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export const ActiveSession = mongoose.model('ActiveSession', activeSessionSchema);

// Zod schemas for validation
export const insertUserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  role: z.string().default('user'),
  permissions: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const insertApplicationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  hwidLockEnabled: z.boolean().default(false),
  loginSuccessMessage: z.string().optional(),
  loginFailedMessage: z.string().optional(),
  accountDisabledMessage: z.string().optional(),
  accountExpiredMessage: z.string().optional(),
  versionMismatchMessage: z.string().optional(),
  hwidMismatchMessage: z.string().optional(),
});

export const updateApplicationSchema = insertApplicationSchema.partial();

export const insertLicenseKeySchema = z.object({
  licenseKey: z.string(),
  maxUsers: z.number().default(1),
  validityDays: z.number(),
  description: z.string().optional(),
});

export const insertAppUserSchema = z.object({
  username: z.string().min(1),
  email: z.union([z.string().email(), z.literal(""), z.null(), z.undefined()]).optional().transform(val => val === "" || val === undefined ? null : val),
  password: z.string().min(6),
  hwid: z.string().optional(),
  role: z.string().default('user'),
  permissions: z.array(z.string()).default([]),
  expiresAt: z.union([z.string(), z.date(), z.null(), z.undefined()]).optional().transform(val => val && typeof val === 'string' ? new Date(val) : val),
  licenseKey: z.string().optional(),
});

export const updateAppUserSchema = insertAppUserSchema.partial();

export const insertWebhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(z.string()).default([]),
});

export const insertBlacklistSchema = z.object({
  applicationId: z.string(),
  type: z.enum(['ip', 'username', 'email', 'hwid']),
  value: z.string(),
  reason: z.string().optional(),
});

export const insertActivityLogSchema = z.object({
  applicationId: z.string(),
  appUserId: z.string().optional(),
  action: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.any().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  version: z.string().optional(),
  hwid: z.string().optional(),
});

// Type exports
export type User = mongoose.InferSchemaType<typeof userSchema>;
export type Application = mongoose.InferSchemaType<typeof applicationSchema>;
export type LicenseKey = mongoose.InferSchemaType<typeof licenseKeySchema>;
export type AppUser = mongoose.InferSchemaType<typeof appUserSchema>;
export type Webhook = mongoose.InferSchemaType<typeof webhookSchema>;
export type BlacklistEntry = mongoose.InferSchemaType<typeof blacklistSchema>;
export type ActivityLog = mongoose.InferSchemaType<typeof activityLogSchema>;
export type ActiveSession = mongoose.InferSchemaType<typeof activeSessionSchema>;

export type UpsertUser = z.infer<typeof insertUserSchema>;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type UpdateApplication = z.infer<typeof updateApplicationSchema>;
export type InsertLicenseKey = z.infer<typeof insertLicenseKeySchema>;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type UpdateAppUser = z.infer<typeof updateAppUserSchema>;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type InsertBlacklistEntry = z.infer<typeof insertBlacklistSchema>;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;