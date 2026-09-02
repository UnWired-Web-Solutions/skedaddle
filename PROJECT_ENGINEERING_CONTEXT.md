---
title: Skedaddle Engineering Context
status: Active project workflow reference
last_reviewed: 2026-09-01
---

# Skedaddle Engineering Context

## Product and authority

Skedaddle Franchise Intelligence is an internal portal for Ay Bello and Dave Henderson’s UWS team. It presents territory-level operational and digital reporting, persistent strategy-report drafts, and reviewable content workflows. Product decisions remain with the user. This repository’s live code, migrations, managed configuration, verified source records, `AGENTS.md`, `docs/PRODUCT_REQUIREMENTS.md`, and current source-design documents are the technical evidence base.

Do not treat an earlier completion claim as proof. Treat a request to investigate, review, diagnose, implement, release, or operate as different authority levels. Do not push, deploy, migrate, rotate credentials, call external mutation APIs, or send communications unless the request and task context explicitly authorize it.

## Current source and reporting invariants

| Area | Required behavior |
|---|---|
| Territory scope | Use approved mapping only. Never infer territories, sub-locations, corporate ownership, or franchise ownership from names or blank fields. |
| Operational data | The UWS-owned Google Drive workbook is the active Salesforce-derived source. It is aggregate-only in portal surfaces, read-only at source, currency-separated, audited, and may be partial. |
| Status and conversion | Inspection, closed-job, close-rate, and lead-to-sale claims remain unavailable until UWS approves a status definition. |
| GA4 and GSC | Preserve property/path scope, complete-month eligibility, source coverage, matched-month YoY rules, and unavailable-not-zero semantics. |
| GBP | Remain fail-closed: Google approval/quota and explicit UWS authorization are required before OAuth, imports, or live data access. |
| Historical context | Legacy snapshots may be retained only when visibly labelled as historical. They must never be presented as current workbook, GA4, GSC, or GBP data. |
| Currency | Never combine CAD and USD in a total, rank, calculation, or narrative. |
| Privacy | Return aggregates only when operational data is displayed. Do not expose addresses, work-order identifiers, salesperson data, credentials, or raw imported rows. |

## Architecture boundaries

The portal uses React, Express, tRPC, Drizzle, and MySQL/TiDB. Custom local portal authentication is required. All portal tRPC procedures remain `publicProcedure`; server-side local authentication and role/territory gating enforce access. Do not introduce Manus OAuth `protectedProcedure` or `adminProcedure`, which are incompatible with the portal’s established access model.

The daily Drive-workbook importer is deterministic, read-only at source, locked, audited, idempotent, revision-aware, and does not call an agent or language model. Do not create duplicate schedules or alter the workbook merely to test an import branch.

## Required engineering lifecycle

Before changing behavior, establish the task outcome, authority, systems affected, source-of-truth constraints, known unknowns, and verification evidence. Trace the entry point through client, server, authorization, data layer, external integrations, generated artifacts, and visible output. Prefer the smallest coherent change that preserves existing contracts.

For authentication, customer data, database, imports, AI-assisted reporting, scheduled work, external integrations, or production changes, review the relevant risk boundary before implementation. Keep secrets out of source, bundles, logs, prompts, fixtures, generated artifacts, and documentation. Record partial coverage and source failures; do not convert them into plausible success.

## Verification and release contract

Use focused regression coverage for the rule changed, then run related tests, the full suite, TypeScript, and the production build as applicable. For UI changes, inspect the real rendered local flow; for reports, export the exact saved draft and inspect the rendered PDF. For release work, distinguish **implemented**, **tested**, **checkpointed**, **pushed**, **migrated**, **deployed**, and **runtime verified**.

Before a checkpoint, read `todo.md`, inspect the exact diff, and preserve unrelated work. After a release, verify the actual production environment rather than assuming a checkpoint propagated. Record any delayed or stale artifact as a deployment limitation, not as completed verification.

## Required project reads

Read `AGENTS.md` and `docs/PRODUCT_REQUIREMENTS.md` before product behavior changes. For Drive-workbook changes, read `SALESFORCE_DRIVE_DAILY_SYNC_DESIGN.md`; for GBP work, read `GBP_LIVE_DATA_MODEL.md` and `GBP_LIVE_INTEGRATION_RESEARCH.md`. Use `TASK_CONTRACT_TEMPLATE.md` for high-risk or multi-stage work, `ENGINEERING_HANDOFF_TEMPLATE.md` for substantial handoffs, and `LEARNING_RECORD_TEMPLATE.md` after a recurring or meaningful defect.

## Open decisions and boundaries

Ownership labels are restricted to the verified **franchise reporting territory** context. Corporate classification is not asserted unless an approved source supplies it. GBP live activation, durable GA4 historical engagement, key-event aggregation, paid-media integrations, content publishing, and social posting require their own approved source definitions and authorization gates.
