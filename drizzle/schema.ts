import { index, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

/**
 * Search Console page performance imported from the single domain property.
 * Each import is already restricted to an approved territory URL prefix.
 */
export const gscPageMetrics = mysqlTable("gsc_page_metrics", {
  id: int("id").autoincrement().primaryKey(),
  territoryId: varchar("territoryId", { length: 64 }).notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  pageUrl: text("pageUrl").notNull(),
  clicks: int("clicks").notNull().default(0),
  impressions: int("impressions").notNull().default(0),
  ctrBps: int("ctrBps").notNull().default(0),
  positionHundredths: int("positionHundredths").notNull().default(0),
  sourceProperty: varchar("sourceProperty", { length: 255 }).notNull(),
  pathPrefix: varchar("pathPrefix", { length: 255 }).notNull(),
});

export type GSCPageMetric = typeof gscPageMetrics.$inferSelect;
export type InsertGSCPageMetric = typeof gscPageMetrics.$inferInsert;

/** Search Console queries for the same territory-scoped monthly imports. */
export const gscQueryMetrics = mysqlTable("gsc_query_metrics", {
  id: int("id").autoincrement().primaryKey(),
  territoryId: varchar("territoryId", { length: 64 }).notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  query: text("query").notNull(),
  clicks: int("clicks").notNull().default(0),
  impressions: int("impressions").notNull().default(0),
  ctrBps: int("ctrBps").notNull().default(0),
  positionHundredths: int("positionHundredths").notNull().default(0),
  sourceProperty: varchar("sourceProperty", { length: 255 }).notNull(),
  pathPrefix: varchar("pathPrefix", { length: 255 }).notNull(),
});

export type GSCQueryMetric = typeof gscQueryMetrics.$inferSelect;
export type InsertGSCQueryMetric = typeof gscQueryMetrics.$inferInsert;

/**
 * Salesforce inspection-to-sale snapshots. Species is `__ALL__` for the
 * territory total; detailed rows use the Salesforce species label.
 */
export const salesforcePerformanceSnapshots = mysqlTable("salesforce_performance_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  territoryId: varchar("territoryId", { length: 64 }).notNull(),
  species: varchar("species", { length: 128 }).notNull().default("__ALL__"),
  periodStart: varchar("periodStart", { length: 10 }).notNull(),
  periodEnd: varchar("periodEnd", { length: 10 }).notNull(),
  inspections: int("inspections").notNull().default(0),
  closedJobs: int("closedJobs").notNull().default(0),
  sourceLabel: varchar("sourceLabel", { length: 255 }).notNull().default("Salesforce"),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
});

export type SalesforcePerformanceSnapshot = typeof salesforcePerformanceSnapshots.$inferSelect;
export type InsertSalesforcePerformanceSnapshot = typeof salesforcePerformanceSnapshots.$inferInsert;

// ─── GBP Content Production ─────────────────────────────────────────────────

/**
 * Durable record for every AI-generated GBP post image.
 *
 * AI images are permitted for GBP posts only. They must remain in a reviewable
 * state and must never be treated as documentary job photos or uploaded to the
 * consumer-facing GBP photo gallery.
 */
export const gbpImageAssets = mysqlTable("gbp_image_assets", {
  id: int("id").autoincrement().primaryKey(),
  generationJobId: varchar("generationJobId", { length: 64 }),
  sourceHash: varchar("sourceHash", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  territoryId: varchar("territoryId", { length: 64 }).notNull(),
  suburb: varchar("suburb", { length: 128 }),
  serviceLabel: varchar("serviceLabel", { length: 128 }).notNull(),
  species: varchar("species", { length: 128 }).notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("imageUrl").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  brandAsset: mysqlEnum("brandAsset", ["official_logo", "text_fallback"]).default("text_fallback").notNull(),
  status: mysqlEnum("status", ["draft", "in_review", "approved", "rejected", "posted"]).default("draft").notNull(),
  qaStatus: mysqlEnum("qaStatus", ["passed", "failed", "unavailable"]).default("unavailable").notNull(),
  qaJson: text("qaJson"),
  generationAttempts: int("generationAttempts").notNull().default(1),
  scheduledFor: varchar("scheduledFor", { length: 10 }),
  reviewedBy: varchar("reviewedBy", { length: 128 }),
  reviewerNotes: text("reviewerNotes"),
  reviewedAt: timestamp("reviewedAt"),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  territoryStatusIdx: index("gbp_assets_territory_status_idx").on(table.territoryId, table.status, table.createdAt),
  jobIdx: index("gbp_assets_job_idx").on(table.generationJobId),
}));

export type GBPImageAsset = typeof gbpImageAssets.$inferSelect;
export type InsertGBPImageAsset = typeof gbpImageAssets.$inferInsert;

/** Persistent progress/results for long-running bulk image jobs. */
export const gbpImageJobs = mysqlTable("gbp_image_jobs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  status: mysqlEnum("status", ["pending", "running", "completed", "partial", "failed", "interrupted"]).default("pending").notNull(),
  total: int("total").notNull().default(0),
  completed: int("completed").notNull().default(0),
  failed: int("failed").notNull().default(0),
  resultsJson: text("resultsJson"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusUpdatedIdx: index("gbp_jobs_status_updated_idx").on(table.status, table.updatedAt),
}));

export type GBPImageJob = typeof gbpImageJobs.$inferSelect;
export type InsertGBPImageJob = typeof gbpImageJobs.$inferInsert;

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

// ─── Suburb Page Content Generator ───────────────────────────────────────────

/**
 * Stores generated suburb page content for the approval workflow.
 * Status: draft → in_review → approved → exported
 */
export const suburbPages = mysqlTable("suburb_pages", {
  id: int("id").autoincrement().primaryKey(),
  territoryId: varchar("territoryId", { length: 64 }).notNull(),
  suburbName: varchar("suburbName", { length: 128 }).notNull(),
  suburbSlug: varchar("suburbSlug", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["draft", "in_review", "approved", "exported"]).default("draft").notNull(),
  contentJson: text("contentJson"), // Full SuburbPageContent as JSON
  schemaJson: text("schemaJson"), // JSON-LD schema blocks
  metaTitle: varchar("metaTitle", { length: 256 }),
  metaDescription: text("metaDescription"),
  h1: varchar("h1", { length: 256 }),
  wordCount: int("wordCount"),
  speciesTiers: text("speciesTiers"), // JSON array of {species, tier, words}
  reviewedBy: varchar("reviewedBy", { length: 128 }),
  reviewerNotes: text("reviewerNotes"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
});

export type SuburbPage = typeof suburbPages.$inferSelect;
export type InsertSuburbPage = typeof suburbPages.$inferInsert;
export type InsertSalesforceConnection = typeof salesforceConnections.$inferInsert;
