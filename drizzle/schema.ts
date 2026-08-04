import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Analytics Tables ─────────────────────────────────────────────────────────

/**
 * GA4 session data by territory, page type, year, and month.
 * Sourced from the "Page Breakdown Skedaddle" spreadsheet tab.
 */
export const ga4Sessions = mysqlTable("ga4_sessions", {
  id: int("id").autoincrement().primaryKey(),
  territory: varchar("territory", { length: 128 }).notNull(),
  pageType: varchar("pageType", { length: 64 }).notNull(), // 'total', 'species_pages', 'blog_pages', 'service_pages', 'location_page'
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  sessions: int("sessions").notNull().default(0),
});

export type GA4Session = typeof ga4Sessions.$inferSelect;
export type InsertGA4Session = typeof ga4Sessions.$inferInsert;

/**
 * GBP metrics by territory, metric type, year, and month.
 * Sourced from the "GBP Data" spreadsheet tab.
 */
export const gbpMetrics = mysqlTable("gbp_metrics", {
  id: int("id").autoincrement().primaryKey(),
  territory: varchar("territory", { length: 128 }).notNull(),
  metricType: varchar("metricType", { length: 32 }).notNull(), // 'calls', 'bookings', 'directions', 'website_clicks'
  year: int("year").notNull(),
  month: int("month").notNull(), // 1-12
  value: int("value").notNull().default(0),
  businessUrl: text("businessUrl"), // GBP listing URL
});

export type GBPMetric = typeof gbpMetrics.$inferSelect;
export type InsertGBPMetric = typeof gbpMetrics.$inferInsert;

// ─── Salesforce Integration ──────────────────────────────────────────────────

/**
 * Stores Salesforce OAuth connection credentials.
 * Only one active connection per org is expected (Skedaddle's Salesforce instance).
 */
export const salesforceConnections = mysqlTable("salesforce_connections", {
  id: int("id").autoincrement().primaryKey(),
  /** Friendly label for this connection */
  label: varchar("label", { length: 128 }).notNull().default("Skedaddle Salesforce"),
  /** Salesforce instance URL (e.g. https://na1.salesforce.com) */
  instanceUrl: text("instanceUrl").notNull(),
  /** OAuth2 access token (short-lived, auto-refreshed) */
  accessToken: text("accessToken").notNull(),
  /** OAuth2 refresh token (long-lived) */
  refreshToken: text("refreshToken").notNull(),
  /** Salesforce user ID that authorized the connection */
  sfUserId: varchar("sfUserId", { length: 64 }),
  /** Salesforce org ID */
  sfOrgId: varchar("sfOrgId", { length: 64 }),
  /** Connection status */
  status: mysqlEnum("status", ["active", "expired", "revoked"]).default("active").notNull(),
  /** Who in our system created this connection */
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesforceConnection = typeof salesforceConnections.$inferSelect;
export type InsertSalesforceConnection = typeof salesforceConnections.$inferInsert;