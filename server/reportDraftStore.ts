import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { reportDrafts } from "../drizzle/schema";
import { getDb } from "./db";

export type ReportDraftType = "strategy" | "proposal";

export async function createReportDraft(input: {
  reportType: ReportDraftType;
  territoryId: string;
  reportStart: string;
  reportEnd: string;
  config: unknown;
  dataSnapshot: unknown;
  sections?: unknown;
  html: string;
  createdByUserId: number;
}) {
  if (!input.html.trim() || /will be populated|please regenerate/i.test(input.html)) {
    throw new Error("Report generation produced incomplete placeholder content; draft was not saved.");
  }
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable. Auditable report drafts cannot be created without persistence.");
  }
  const id = randomUUID();
  await db.insert(reportDrafts).values({
    id,
    reportType: input.reportType,
    territoryId: input.territoryId,
    reportStart: input.reportStart,
    reportEnd: input.reportEnd,
    configJson: input.config,
    dataSnapshotJson: input.dataSnapshot,
    sectionsJson: input.sections ?? null,
    html: input.html,
    createdByUserId: input.createdByUserId,
  });
  return id;
}

export async function getReportDraft(id: string, reportType: ReportDraftType) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable. Saved report draft cannot be loaded.");
  const rows = await db.select().from(reportDrafts).where(and(
    eq(reportDrafts.id, id),
    eq(reportDrafts.reportType, reportType),
  )).limit(1);
  const draft = rows[0];
  if (!draft) throw new Error("Saved report draft not found.");
  if (draft.status === "rejected") throw new Error("Rejected report drafts cannot be exported.");
  return draft;
}

export async function markReportDraftExported(id: string, pdfUrl: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable. Report export could not be audited.");
  await db.update(reportDrafts).set({
    status: "exported",
    pdfUrl,
    exportedByUserId: userId,
    exportedAt: new Date(),
  }).where(eq(reportDrafts.id, id));
}
