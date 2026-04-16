/*

Lines 9 - 95 written by Nate Gibson 

Database schema from our AWS DBS

*/

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  occupation: text("occupation").notNull(),
  department: text("department").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  status: text("status").notNull().default("pending"),
  city: text("city"),
  state: text("state"),
  emailVerified: boolean("email_verified").notNull().default(true),
  phoneVerified: boolean("phone_verified").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  emailCode: text("email_code").notNull(),
  phoneCode: text("phone_code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const guideContent = pgTable("guide_content", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sectionKey: text("section_key").notNull(),
  sectionTitle: text("section_title").notNull(),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull(),
  targetRole: text("target_role").notNull().default("law_enforcement"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationEmails = pgTable("notification_emails", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const approvalTokens = pgTable("approval_tokens", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  token: text("token").notNull().unique(),
  userId: varchar("user_id").notNull(),
  action: text("action").notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationEmail = typeof notificationEmails.$inferSelect;
export type ApprovalToken = typeof approvalTokens.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  occupation: true,
  department: true,
  password: true,
  role: true,
  city: true,
  state: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const USER_TYPES = ["law_enforcement", "nurse", "cps"] as const;
export type UserType = typeof USER_TYPES[number];

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GuideSection = typeof guideContent.$inferSelect;
export type VerificationCode = typeof verificationCodes.$inferSelect;
