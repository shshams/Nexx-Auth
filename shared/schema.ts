import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  index,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: integer("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = sqliteTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  role: text("role").notNull().default("user"), // 'owner', 'admin', 'moderator', 'user'
  permissions: text("permissions").notNull().default("[]"), // JSON string of permissions array
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").default(Date.now()),
  updatedAt: integer("updated_at").default(Date.now()),
});

// Applications table - users can create multiple applications
export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  apiKey: text("api_key").notNull().unique(),
  version: text("version").notNull().default("1.0.0"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  hwidLockEnabled: integer("hwid_lock_enabled", { mode: "boolean" }).notNull().default(false),
  // Custom messages for different scenarios
  loginSuccessMessage: text("login_success_message").default("Login successful!"),
  loginFailedMessage: text("login_failed_message").default("Invalid credentials!"),
  accountDisabledMessage: text("account_disabled_message").default("Account is disabled!"),
  accountExpiredMessage: text("account_expired_message").default("Account has expired!"),
  versionMismatchMessage: text("version_mismatch_message").default("Please update your application to the latest version!"),
  hwidMismatchMessage: text("hwid_mismatch_message").default("Hardware ID mismatch detected!"),
  pauseUserMessage: text("pause_user_message").default("Account Is Paused Temporally. Contract Support"),
  createdAt: integer("created_at").notNull().default(Date.now()),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

// License keys for applications
export const licenseKeys = sqliteTable("license_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  licenseKey: text("license_key").notNull().unique(),
  maxUsers: integer("max_users").notNull().default(1),
  currentUsers: integer("current_users").notNull().default(0),
  validityDays: integer("validity_days").notNull(),
  expiresAt: integer("expires_at"), // Nullable for unlimited validity
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  description: text("description"),
  createdAt: integer("created_at").notNull().default(Date.now()),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

// Application users (users created for specific applications with license keys)
export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  licenseKeyId: integer("license_key_id").references(() => licenseKeys.id, { onDelete: "set null" }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isPaused: integer("is_paused", { mode: "boolean" }).notNull().default(false),
  hwid: text("hwid"), // Hardware ID for locking
  lastLoginIp: text("last_login_ip"), // IP address from last login
  expiresAt: integer("expires_at"), // Time limit for user validity (inherited from license)
  createdAt: integer("created_at").notNull().default(Date.now()),
  lastLogin: integer("last_login"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lastLoginAttempt: integer("last_login_attempt"),
}, (table) => {
  return {
    uniqueUsernamePerApp: index("unique_username_per_app").on(table.applicationId, table.username),
    uniqueEmailPerApp: index("unique_email_per_app").on(table.applicationId, table.email),
  };
});

// Webhook configurations
export const webhooks = sqliteTable("webhooks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret"), // For webhook signature verification
  events: text("events").notNull().default("[]"), // JSON string of event types to listen for
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(Date.now()),
  updatedAt: integer("updated_at").notNull().default(Date.now()),
});

// Blacklist system
export const blacklist = sqliteTable("blacklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'ip', 'hwid', 'username', 'email'
  value: text("value").notNull(), // The actual value to blacklist
  reason: text("reason"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at").notNull().default(Date.now()),
  createdBy: text("created_by").references(() => users.id),
}, (table) => {
  return {
    uniqueBlacklistEntry: index("unique_blacklist_entry").on(table.applicationId, table.type, table.value),
  };
});

// Activity logs for webhook events and tracking
export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }),
  appUserId: integer("app_user_id").references(() => appUsers.id, { onDelete: "cascade" }),
  event: text("event").notNull(), // 'login', 'register', 'login_failed', 'logout', etc.
  ipAddress: text("ip_address"),
  hwid: text("hwid"),
  userAgent: text("user_agent"),
  metadata: text("metadata"), // Additional event data as JSON string
  success: integer("success", { mode: "boolean" }).notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull().default(Date.now()),
}, (table) => {
  return {
    activityLogsByApp: index("activity_logs_by_app").on(table.applicationId, table.createdAt),
    activityLogsByUser: index("activity_logs_by_user").on(table.appUserId, table.createdAt),
  };
});

// Real-time sessions tracking
export const activeSessions = sqliteTable("active_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  appUserId: integer("app_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address"),
  hwid: text("hwid"),
  userAgent: text("user_agent"),
  location: text("location"), // Geolocation info
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastActivity: integer("last_activity").notNull().default(Date.now()),
  createdAt: integer("created_at").notNull().default(Date.now()),
  expiresAt: integer("expires_at"),
}, (table) => {
  return {
    activeSessionsByApp: index("active_sessions_by_app").on(table.applicationId, table.isActive),
    activeSessionsByUser: index("active_sessions_by_user").on(table.appUserId, table.isActive),
  };
});

export const insertApplicationSchema = createInsertSchema(applications).pick({
  name: true,
  description: true,
  version: true,
  hwidLockEnabled: true,
  loginSuccessMessage: true,
  loginFailedMessage: true,
  accountDisabledMessage: true,
  accountExpiredMessage: true,
  versionMismatchMessage: true,
  hwidMismatchMessage: true,
  pauseUserMessage: true,
});

export const insertLicenseKeySchema = createInsertSchema(licenseKeys).pick({
  licenseKey: true,
  maxUsers: true,
  validityDays: true,
  description: true,
}).extend({
  maxUsers: z.number().min(1).default(1),
  validityDays: z.number().min(1).optional(),
  expiresAt: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().nullable(),
  description: z.string().optional().nullable(),
});

export const insertAppUserSchema = createInsertSchema(appUsers).pick({
  username: true,
  password: true,
}).extend({
  email: z.union([z.string().email(), z.literal(""), z.null(), z.undefined()]).optional().transform(val => val === "" || val === undefined ? null : val),
  expiresAt: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
  hwid: z.union([z.string(), z.null(), z.undefined()]).optional().nullable(),
  licenseKey: z.union([z.string(), z.null(), z.undefined()]).optional(), // Optional license key - required for external API, optional for admin creation
});

export const updateApplicationSchema = createInsertSchema(applications).pick({
  name: true,
  description: true,
  version: true,
  isActive: true,
  hwidLockEnabled: true,
  loginSuccessMessage: true,
  loginFailedMessage: true,
  accountDisabledMessage: true,
  accountExpiredMessage: true,
  versionMismatchMessage: true,
  hwidMismatchMessage: true,
  pauseUserMessage: true,
}).partial();

export const updateAppUserSchema = createInsertSchema(appUsers).pick({
  username: true,
  password: true,
  email: true,
  isActive: true,
  isPaused: true,
  hwid: true,
  expiresAt: true,
  lastLogin: true,
  lastLoginIp: true,
  loginAttempts: true,
  lastLoginAttempt: true,
}).partial().extend({
  hwid: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  version: z.string().optional(),
  hwid: z.string().optional(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).pick({
  url: true,
  secret: true,
  events: true,
});

export const insertBlacklistSchema = createInsertSchema(blacklist).pick({
  applicationId: true,
  type: true,
  value: true,
  reason: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  applicationId: true,
  appUserId: true,
  event: true,
  ipAddress: true,
  hwid: true,
  userAgent: true,
  metadata: true,
  success: true,
  errorMessage: true,
}).extend({
  success: z.boolean().optional(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type UpdateApplication = z.infer<typeof updateApplicationSchema>;
export type LicenseKey = typeof licenseKeys.$inferSelect;
export type InsertLicenseKey = z.infer<typeof insertLicenseKeySchema>;
export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type UpdateAppUser = z.infer<typeof updateAppUserSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type BlacklistEntry = typeof blacklist.$inferSelect;
export type InsertBlacklistEntry = z.infer<typeof insertBlacklistSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActiveSession = typeof activeSessions.$inferSelect;
  
