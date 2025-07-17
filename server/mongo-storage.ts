import {
  User,
  Application,
  LicenseKey,
  AppUser,
  Webhook,
  BlacklistEntry,
  ActivityLog,
  ActiveSession,
  type UpsertUser,
  type InsertApplication,
  type UpdateApplication,
  type InsertLicenseKey,
  type InsertAppUser,
  type UpdateAppUser,
  type InsertWebhook,
  type InsertBlacklistEntry,
  type InsertActivityLog,
} from "@shared/mongo-schema";
import { connectMongoose } from "./mongodb";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<any | undefined>;
  getAllUsers(): Promise<any[]>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<any | undefined>;
  deleteUser(id: string): Promise<boolean>;
  upsertUser(user: UpsertUser): Promise<any>;
  
  // Application methods
  getApplication(id: string): Promise<any | undefined>;
  getApplicationByApiKey(apiKey: string): Promise<any | undefined>;
  createApplication(userId: string, app: InsertApplication): Promise<any>;
  updateApplication(id: string, updates: UpdateApplication): Promise<any | undefined>;
  deleteApplication(id: string): Promise<boolean>;
  getAllApplications(userId: string): Promise<any[]>;
  
  // License Key methods
  createLicenseKey(applicationId: string, license: InsertLicenseKey): Promise<any>;
  getLicenseKey(id: string): Promise<any | undefined>;
  getLicenseKeyByKey(licenseKey: string): Promise<any | undefined>;
  getAllLicenseKeys(applicationId: string): Promise<any[]>;
  updateLicenseKey(id: string, updates: Partial<InsertLicenseKey>): Promise<any | undefined>;
  deleteLicenseKey(id: string): Promise<boolean>;
  validateLicenseKey(licenseKey: string, applicationId: string): Promise<any | null>;
  incrementLicenseUsage(licenseKeyId: string): Promise<boolean>;
  decrementLicenseUsage(licenseKeyId: string): Promise<boolean>;
  
  // App User methods
  getAppUser(id: string): Promise<any | undefined>;
  getAppUserByUsername(applicationId: string, username: string): Promise<any | undefined>;
  getAppUserByEmail(applicationId: string, email: string): Promise<any | undefined>;
  createAppUser(applicationId: string, user: InsertAppUser): Promise<any>;
  createAppUserWithLicense(applicationId: string, user: InsertAppUser): Promise<any>;
  updateAppUser(id: string, updates: UpdateAppUser): Promise<any | undefined>;
  deleteAppUser(id: string): Promise<boolean>;
  pauseAppUser(id: string): Promise<boolean>;
  unpauseAppUser(id: string): Promise<boolean>;
  resetAppUserHwid(id: string): Promise<boolean>;
  setAppUserHwid(id: string, hwid: string): Promise<boolean>;
  getAllAppUsers(applicationId: string): Promise<any[]>;
  
  // Webhook methods
  createWebhook(userId: string, webhook: InsertWebhook): Promise<any>;
  getUserWebhooks(userId: string): Promise<any[]>;
  updateWebhook(id: string, updates: Partial<InsertWebhook>): Promise<any | undefined>;
  deleteWebhook(id: string): Promise<boolean>;
  
  // Blacklist methods
  createBlacklistEntry(entry: InsertBlacklistEntry): Promise<any>;
  getBlacklistEntries(applicationId?: string): Promise<any[]>;
  checkBlacklist(applicationId: string, type: string, value: string): Promise<any | undefined>;
  deleteBlacklistEntry(id: string): Promise<boolean>;
  
  // Activity logging methods
  createActivityLog(log: InsertActivityLog): Promise<any>;
  getActivityLogs(applicationId: string, limit?: number): Promise<any[]>;
  getUserActivityLogs(appUserId: string, limit?: number): Promise<any[]>;
  
  // Session tracking methods
  createActiveSession(session: Omit<any, 'id' | 'createdAt' | 'lastActivity'>): Promise<any>;
  getActiveSessions(applicationId: string): Promise<any[]>;
  updateSessionActivity(sessionToken: string): Promise<boolean>;
  endSession(sessionToken: string): Promise<boolean>;
  
  // Auth methods
  validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
}

export class MongoStorage implements IStorage {
  constructor() {
    // Initialize MongoDB connection
    connectMongoose();
  }

  // User operations for Replit Auth
  async getUser(id: string): Promise<any | undefined> {
    const user = await User.findOne({ id });
    return user?.toObject();
  }

  async upsertUser(userData: UpsertUser): Promise<any> {
    // Set special permissions for mohitsindhu121@gmail.com
    const updateData: any = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      role: 'user',
      permissions: [],
      isActive: true,
      updatedAt: new Date(),
    };

    if (userData.email === 'mohitsindhu121@gmail.com') {
      updateData.role = 'owner';
      updateData.permissions = [
        'edit_code', 
        'manage_users', 
        'manage_applications', 
        'view_all_data', 
        'delete_applications', 
        'manage_permissions', 
        'access_admin_panel'
      ];
      updateData.isActive = true;
    }

    const user = await User.findOneAndUpdate(
      { id: userData.id },
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return user?.toObject();
  }

  async getAllUsers(): Promise<any[]> {
    const users = await User.find();
    return users.map(user => user.toObject());
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<any | undefined> {
    const user = await User.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return user?.toObject();
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await User.deleteOne({ id });
    return result.deletedCount > 0;
  }

  // Application methods
  async getApplication(id: string): Promise<any | undefined> {
    const app = await Application.findById(id);
    return app?.toObject();
  }

  async getApplicationByApiKey(apiKey: string): Promise<any | undefined> {
    const app = await Application.findOne({ apiKey });
    return app?.toObject();
  }

  async createApplication(userId: string, appData: InsertApplication): Promise<any> {
    const apiKey = nanoid(32);
    const app = new Application({
      ...appData,
      userId,
      apiKey,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await app.save();
    return app.toObject();
  }

  async updateApplication(id: string, updates: UpdateApplication): Promise<any | undefined> {
    const app = await Application.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return app?.toObject();
  }

  async deleteApplication(id: string): Promise<boolean> {
    const result = await Application.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async getAllApplications(userId: string): Promise<any[]> {
    const apps = await Application.find({ userId });
    return apps.map(app => app.toObject());
  }

  // License Key methods
  async createLicenseKey(applicationId: string, licenseData: InsertLicenseKey): Promise<any> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + licenseData.validityDays);
    
    const license = new LicenseKey({
      ...licenseData,
      applicationId,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await license.save();
    return license.toObject();
  }

  async getLicenseKey(id: string): Promise<any | undefined> {
    const license = await LicenseKey.findById(id);
    return license?.toObject();
  }

  async getLicenseKeyByKey(licenseKey: string): Promise<any | undefined> {
    const license = await LicenseKey.findOne({ licenseKey });
    return license?.toObject();
  }

  async getAllLicenseKeys(applicationId: string): Promise<any[]> {
    const licenses = await LicenseKey.find({ applicationId });
    return licenses.map(license => license.toObject());
  }

  async updateLicenseKey(id: string, updates: Partial<InsertLicenseKey>): Promise<any | undefined> {
    const license = await LicenseKey.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return license?.toObject();
  }

  async deleteLicenseKey(id: string): Promise<boolean> {
    const result = await LicenseKey.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async validateLicenseKey(licenseKey: string, applicationId: string): Promise<any | null> {
    const license = await LicenseKey.findOne({
      licenseKey,
      applicationId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });
    return license?.toObject() || null;
  }

  async incrementLicenseUsage(licenseKeyId: string): Promise<boolean> {
    const result = await LicenseKey.updateOne(
      { _id: licenseKeyId },
      { $inc: { currentUsers: 1 } }
    );
    return result.modifiedCount > 0;
  }

  async decrementLicenseUsage(licenseKeyId: string): Promise<boolean> {
    const result = await LicenseKey.updateOne(
      { _id: licenseKeyId },
      { $inc: { currentUsers: -1 } }
    );
    return result.modifiedCount > 0;
  }

  // App User methods
  async getAppUser(id: string): Promise<any | undefined> {
    const user = await AppUser.findById(id);
    return user?.toObject();
  }

  async getAppUserByUsername(applicationId: string, username: string): Promise<any | undefined> {
    const user = await AppUser.findOne({ applicationId, username });
    return user?.toObject();
  }

  async getAppUserByEmail(applicationId: string, email: string): Promise<any | undefined> {
    const user = await AppUser.findOne({ applicationId, email });
    return user?.toObject();
  }

  async createAppUser(applicationId: string, userData: InsertAppUser): Promise<any> {
    const hashedPassword = await this.hashPassword(userData.password);
    const user = new AppUser({
      ...userData,
      applicationId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await user.save();
    return user.toObject();
  }

  async createAppUserWithLicense(applicationId: string, userData: InsertAppUser): Promise<any> {
    const hashedPassword = await this.hashPassword(userData.password);
    const user = new AppUser({
      ...userData,
      applicationId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await user.save();
    return user.toObject();
  }

  async updateAppUser(id: string, updates: UpdateAppUser): Promise<any | undefined> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.password) {
      updateData.password = await this.hashPassword(updates.password);
    }
    const user = await AppUser.findByIdAndUpdate(id, updateData, { new: true });
    return user?.toObject();
  }

  async deleteAppUser(id: string): Promise<boolean> {
    const result = await AppUser.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async pauseAppUser(id: string): Promise<boolean> {
    const result = await AppUser.updateOne({ _id: id }, { isActive: false });
    return result.modifiedCount > 0;
  }

  async unpauseAppUser(id: string): Promise<boolean> {
    const result = await AppUser.updateOne({ _id: id }, { isActive: true });
    return result.modifiedCount > 0;
  }

  async resetAppUserHwid(id: string): Promise<boolean> {
    const result = await AppUser.updateOne({ _id: id }, { hwid: null });
    return result.modifiedCount > 0;
  }

  async setAppUserHwid(id: string, hwid: string): Promise<boolean> {
    const result = await AppUser.updateOne({ _id: id }, { hwid });
    return result.modifiedCount > 0;
  }

  async getAllAppUsers(applicationId: string): Promise<any[]> {
    const users = await AppUser.find({ applicationId });
    return users.map(user => user.toObject());
  }

  // Webhook methods
  async createWebhook(userId: string, webhookData: InsertWebhook): Promise<any> {
    const webhook = new Webhook({
      ...webhookData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await webhook.save();
    return webhook.toObject();
  }

  async getUserWebhooks(userId: string): Promise<any[]> {
    const webhooks = await Webhook.find({ userId });
    return webhooks.map(webhook => webhook.toObject());
  }

  async updateWebhook(id: string, updates: Partial<InsertWebhook>): Promise<any | undefined> {
    const webhook = await Webhook.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    return webhook?.toObject();
  }

  async deleteWebhook(id: string): Promise<boolean> {
    const result = await Webhook.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Blacklist methods
  async createBlacklistEntry(entryData: InsertBlacklistEntry): Promise<any> {
    const entry = new BlacklistEntry({
      ...entryData,
      createdAt: new Date(),
    });
    await entry.save();
    return entry.toObject();
  }

  async getBlacklistEntries(applicationId?: string): Promise<any[]> {
    const filter = applicationId ? { applicationId } : {};
    const entries = await BlacklistEntry.find(filter);
    return entries.map(entry => entry.toObject());
  }

  async checkBlacklist(applicationId: string, type: string, value: string): Promise<any | undefined> {
    const entry = await BlacklistEntry.findOne({ applicationId, type, value });
    return entry?.toObject();
  }

  async deleteBlacklistEntry(id: string): Promise<boolean> {
    const result = await BlacklistEntry.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  // Activity logging methods
  async createActivityLog(logData: InsertActivityLog): Promise<any> {
    const log = new ActivityLog({
      ...logData,
      createdAt: new Date(),
    });
    await log.save();
    return log.toObject();
  }

  async getActivityLogs(applicationId: string, limit?: number): Promise<any[]> {
    const query = ActivityLog.find({ applicationId }).sort({ createdAt: -1 });
    if (limit) query.limit(limit);
    const logs = await query.exec();
    return logs.map(log => log.toObject());
  }

  async getUserActivityLogs(appUserId: string, limit?: number): Promise<any[]> {
    const query = ActivityLog.find({ appUserId }).sort({ createdAt: -1 });
    if (limit) query.limit(limit);
    const logs = await query.exec();
    return logs.map(log => log.toObject());
  }

  // Session tracking methods
  async createActiveSession(sessionData: Omit<any, 'id' | 'createdAt' | 'lastActivity'>): Promise<any> {
    const session = new ActiveSession({
      ...sessionData,
      createdAt: new Date(),
      lastActivity: new Date(),
    });
    await session.save();
    return session.toObject();
  }

  async getActiveSessions(applicationId: string): Promise<any[]> {
    const sessions = await ActiveSession.find({ applicationId });
    return sessions.map(session => session.toObject());
  }

  async updateSessionActivity(sessionToken: string): Promise<boolean> {
    const result = await ActiveSession.updateOne(
      { sessionToken },
      { lastActivity: new Date() }
    );
    return result.modifiedCount > 0;
  }

  async endSession(sessionToken: string): Promise<boolean> {
    const result = await ActiveSession.deleteOne({ sessionToken });
    return result.deletedCount > 0;
  }

  // Auth methods
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }
}

export const storage = new MongoStorage();