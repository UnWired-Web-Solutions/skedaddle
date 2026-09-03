# Skedaddle Portal: UWS-Controlled Migration Plan

**Purpose.** This plan provides a controlled path for UWS to operate the Skedaddle franchise portal outside Manus if Dave decides to do so. It is a **migration plan, not a completed migration**. It does not request, move, rotate, expose, or delete any credentials, database records, assets, domains, or Google Business Profile settings.

> **Current state:** The portal is live on Manus, its current code is mirrored to the UWS-controlled GitHub repository, and live GBP data remains deliberately inactive pending Google allowlist case `6-1216000040949`. A migration must preserve that safety gate rather than trying to make GBP live during cutover.

## 1. Recommended target architecture

The lowest-risk UWS-controlled target is **Google Cloud Run** for the containerized application, **Cloud SQL for MySQL** for the relational database, **Cloud Storage** for reports/PDFs/generated assets, **Secret Manager** for credentials, **Artifact Registry** for immutable image builds, and a UWS-controlled domain. This keeps the application close to the existing UWS Google Cloud work for GSC, GA4, and GBP, while separating production application ownership from the hosted development platform.

Cloud Run can deploy immutable container revisions from Artifact Registry and supports controlled traffic rollout rather than an all-at-once replacement.[1] Cloud Run services can use Secret Manager references, with access governed by the runtime service account.[2] If Cloud SQL is selected, the application and database should use the same region where practical, and the runtime service account needs the Cloud SQL Client role.[3]

| Layer | Recommended UWS-controlled service | Migration requirement | Equivalent alternative |
|---|---|---|---|
| Source control | [UWS GitHub repository](https://github.com/UnWired-Web-Solutions/skedaddle) | Protect `main`, require review for infrastructure changes, and retain release tags | GitLab or Azure Repos |
| Build artifact | Google Artifact Registry | Build a Node 22 container per immutable Git commit | GitHub Container Registry, ECR, or ACR |
| Application runtime | Cloud Run | Run the Express/tRPC server behind HTTPS with Cloud Run-managed revisions | AWS ECS/Fargate, Azure Container Apps, DigitalOcean App Platform |
| Database | Cloud SQL for MySQL | Restore verified logical backup; run Drizzle migrations in a reviewed release step | AWS RDS MySQL, Azure Database for MySQL, DigitalOcean Managed MySQL |
| Object storage | Cloud Storage + optional CDN | Migrate the current `/manus-storage/*` asset inventory and update URLs | S3, Azure Blob Storage, DigitalOcean Spaces |
| Secrets | Secret Manager | Store values by name; grant only the runtime service account access | AWS Secrets Manager, Azure Key Vault, Doppler/1Password Connect |
| Authentication | Server-backed UWS identity provider | Replace both Manus OAuth and the present client-side credential check | Auth0, Clerk, Microsoft Entra ID, Google Identity Platform |
| Observability | Cloud Logging/Monitoring + alerting | Record deploys, errors, PDF failures, imports, and auth events | Datadog, Sentry, Grafana Cloud |

No external provider is required to be selected now. The target architecture above is recommended because it fits the existing Node/MySQL/Google integration footprint; it is not a claim that UWS has already provisioned any of those production resources.

## 2. What is portable today and what must be replaced

The application is a portable Node/TypeScript system: React 19, Vite, Express 4, tRPC 11, Drizzle, and MySQL-compatible schema. It runs with Node 22 and uses a Dockerfile that installs Chromium plus DejaVu/Noto fonts for Puppeteer PDF rendering. The canonical source repository already contains the application, test suite, Drizzle migrations, and container recipe.

| Area | Present implementation | Migration action | Cutover rule |
|---|---|---|---|
| Web/API | React/Vite client and Express/tRPC server | Build the existing container in UWS CI; bind the provider-supplied `PORT`; retain `/api/trpc` contract | Do not change public route shapes during the infrastructure move |
| Database | Drizzle schema and MySQL/TiDB-compatible managed database | Create a new UWS MySQL target; restore backup; apply migrations through a reviewed release process | Never overwrite the source database or use destructive schema changes during cutover |
| Asset storage | Manus Forge presign endpoints and `/manus-storage/*` redirects | Replace `server/storage.ts` and `server/_core/storageProxy.ts` with UWS object-storage adapter and public/signed delivery URLs | Keep an asset manifest; do not switch URLs until every required object is verified |
| Manus OAuth | `VITE_APP_ID`, `OAUTH_SERVER_URL`, Manus session adapter/routes | Remove the Manus OAuth adapter and implement one server-enforced UWS auth provider | Do not port the existing demo/sessionStorage login as a production security model |
| Local portal login | Server-validated managed registry with signed HttpOnly sessions and role/location authorization | Retain as the minimum security baseline or replace with a UWS managed identity provider; move plaintext registry passwords to hashes or managed identity before broader external use | Test that every franchise user is restricted to its own territory |
| AI/report fallback | Direct Anthropic primary plus a Manus Forge fallback | Keep approved direct-provider integrations; replace Forge-only fallback with a UWS-owned vendor account/adapter if still needed | No model or key is migrated until UWS explicitly approves its provider/account ownership |
| Image generation | GPT Image pathway with a Forge fallback | Move any active image route to a UWS-owned direct API account and retain the existing human review/QA safeguards | Keep GBP photo/post compliance controls intact |
| Google data | GSC/GA4 service access; future GBP user OAuth | Reauthorize the UWS runtime identity and change GBP callback only after approval | GBP stays disabled; do not request live data as part of migration |
| Salesforce-derived operations | UWS-owned Google Drive workbook with deterministic daily aggregate import | Reauthorize the UWS runtime identity for the exact workbook and retain revision, exclusion, currency, and completed-period safeguards | Do not restore the retired Connected App path or substitute estimates and placeholder data |

## 3. Ownership and discovery gate

Before changing code or infrastructure, UWS should name a technical owner and record the following in an encrypted, UWS-controlled handover register. This is an inventory task; no secret values belong in the repository or this plan.

| Required confirmation | Evidence to retain | Status now |
|---|---|---|
| Repository control | UWS organisation ownership, admin access, branch rules, recovery access | Code is mirrored to the UWS GitHub repository; validate the final organisation URL and deployment permissions during kickoff |
| Domain control | Registrar, DNS zone owner, and approved production hostname | Pending UWS/Dave decision; `skedaddle.manus.space` is not an independently portable hostname |
| Database export authority | Named UWS owner and encrypted backup destination | Pending; data must be exported only by an authorized database administrator |
| Object inventory authority | Manifest of reports, PDFs, images, and other required assets | Pending; current artifact URLs use the Manus storage path |
| Provider ownership | UWS billing/admin for GCP, Anthropic, Perplexity, Google, and future Salesforce/GBP accounts | Partly available; conduct a documented ownership review before production use |
| Security ownership | Two UWS administrators, emergency access, incident contact | Pending designation |

## 4. Phase A — Create the UWS landing zone

Create a dedicated UWS production environment, separate from personal accounts and preferably separate from experimental resources. Define an application runtime service account with only the permissions it needs, a deploy identity for CI, a database administrator role kept outside the application runtime, and at least two UWS administrators with recovery access.

Provision the target database, object-storage bucket, Artifact Registry repository, Secret Manager, staging service, and production service. Configure logs, error alerting, audit logging, and a backup/restore policy **before** copying data. Set deletion protection or equivalent controls on the production database and storage bucket where the selected provider supports them.

Use a UWS-owned staging hostname first. Do not bind or cut over the production hostname at this phase.

## 5. Phase B — Make the application host-independent

Create a dedicated migration branch from the currently verified GitHub `main`. The purpose is to replace platform-bound adapters while retaining business behavior, SQL migrations, data rules, and all existing no-fabrication safeguards.

### Required code changes

1. **Storage adapter.** Replace Forge presign calls and `/manus-storage/*` redirects with a provider-neutral `StorageService` interface. Implement Cloud Storage first if UWS selects GCP. Store keys, content type, checksum, created time, and source-manifest ID; return application URLs that are not tied to Manus.
2. **Authentication.** Remove the Manus OAuth SDK and replace the current client-only credential map with server-enforced authentication. A managed UWS identity provider or a server-backed email/password system is acceptable, provided user records are stored safely, passwords are hashed, session cookies are HttpOnly/Secure/SameSite, logout works, and territory/administrator authorization is checked on the server.
3. **Configuration.** Create a provider-neutral environment contract. Keep only variable names in example files; never copy values from a hosted secret manager into GitHub.
4. **Platform packages.** Remove `vite-plugin-manus-runtime` and related preview/debug wiring after the replacement is tested. Preserve the Node 22 container, Chromium path, and required fonts for PDF generation.
5. **AI adapters.** Retain direct Anthropic/Perplexity provider integrations that UWS approves. Replace any active Forge-only LLM/image fallback with a UWS-owned provider adapter, preserving explicit model selection and no-fabrication fallbacks.
6. **Google callbacks.** Keep GBP OAuth endpoints disabled until Google approves access. When approved, change the registered GBP redirect URI to the final UWS-controlled hostname, then test a new signed-state flow. Do not copy the Manus callback assumption forward.

## 6. Phase C — Move data and assets safely

The migration must separate **schema migration**, **database data migration**, and **object migration**. Do not rely on dashboard figures as a substitute for a database backup.

1. Freeze the target schema version by tagging the source commit and recording the Drizzle migration list.
2. Create an encrypted, access-controlled logical export of the authorized source database. Record table row counts and checksums or equivalent validation evidence at export time.
3. Restore into the empty UWS database. Apply only reviewed migrations required after the backup’s schema version. Existing legacy GBP spreadsheet records must remain separate from new live-GBP tables.
4. Build an asset manifest from every currently required report, PDF, image, and stored artifact. For each object, retain old key/path, destination key, content type, byte length, checksum, and migration result.
5. Copy objects to UWS storage and validate the manifest. Update the application only after required-object fetches are successful.
6. Run a reconciliation report: database counts by table, representative immutable IDs, asset manifest totals, and a controlled browser/PDF check. Any mismatch is a release blocker, not a value to estimate.

## 7. Phase D — Configure secrets and external integrations

Store each required value as a separate secret and grant access only to the runtime service account. Cloud Run validates referenced secrets against the service identity at deployment; pin environment-variable secrets to an intentional version and use a rotation procedure.[2]

| Secret category | Examples of names to inventory | Required migration handling |
|---|---|---|
| Application security | `JWT_SECRET`, database connection configuration | Generate UWS-owned values; do not reuse a platform-managed session secret |
| Google analytics/search | `GSC_SERVICE_ACCOUNT_JSON` or a replacement workload identity | Prefer a UWS runtime service account granted explicit GSC/GA4 access; rotate/revoke static keys only after the new path is verified |
| GBP OAuth | `GBP_OAUTH_CLIENT_ID`, `GBP_OAUTH_CLIENT_SECRET`, `GBP_OAUTH_REFRESH_TOKEN` | Keep refresh authorization absent until Google approves access; update redirect URI during approved activation only |
| AI/research | `ANTHROPIC_API_KEY`, `SONAR_API_KEY`, any approved image-generation key | Reissue or transfer ownership to UWS; add spend controls and rotation records |
| Salesforce | `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, redirect URI | Remain unset until approved UWS Salesforce access is supplied |

Every integration test must be deliberately scoped. GSC/GA4 can run read-only validation; GBP must remain disabled while quota is zero; Salesforce tests must not start before authorized credentials exist.

## 8. Phase E — Staging verification and acceptance gates

Deploy the migration branch to staging with no production DNS traffic. The staging database must be an approved copy or sanitized data set, never an unapproved production dump.

| Gate | Evidence required before cutover |
|---|---|
| Build integrity | `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, and `pnpm build` pass from the immutable release commit |
| Container readiness | Container starts on provider `PORT`; Chromium-based sample PDF renders with expected fonts and no page overflow |
| Auth/security | Administrator and territory account tests show server-enforced access boundaries; no client-side bypass controls remain |
| Database | Schema version, row-count reconciliation, and selected record checks match the approved export evidence |
| Storage | Required artifact manifest resolves without 404/permission errors; unauthorized private assets remain inaccessible |
| API/UI | tRPC endpoints, strategy report preview/export, Analytics, and the login flow pass browser checks |
| Data integrity | GSC/GA4 source labels and GBP legacy/partial/unavailable rules render unchanged; no zero-fill or invented metric appears |
| External dependencies | Google callbacks, Salesforce, and AI integrations are individually tested only within their approved scope |
| Recovery | A documented rollback rehearsal returns staging traffic to the last known-good revision/database without data ambiguity |

## 9. Phase F — Blue/green production cutover

The production move should use a **blue/green** process: keep Manus unchanged as the blue environment while the UWS-hosted green environment is validated on its own hostname. Select a change window only after UWS has an approved owner, final hostname, successful staging gates, current backup, and an explicit go/no-go decision from Dave or the delegated UWS owner.

1. Tag the release commit and record exact image digest, database backup ID, migration version, secret versions, and asset manifest revision.
2. Temporarily quiesce writes or place write-capable features in read-only maintenance mode. Record any final data delta rather than assuming there is none.
3. Take the final authorized backup and copy the final approved asset delta.
4. Deploy the green revision with no traffic or on the staging hostname. Re-run the acceptance gates on the production configuration.
5. Bind the UWS-controlled production hostname and direct traffic to green. Monitor HTTP errors, authentication failures, storage responses, PDF rendering, and data-source statuses.
6. Keep blue available and read-only for the UWS-defined stabilization period. Do not delete the original deployment, database, or storage objects until UWS signs off on reconciliation and recovery readiness.

## 10. Rollback plan

Rollback must be prepared before the DNS/domain change. The standard rollback is to route traffic back to the unchanged blue application, not to edit production code under pressure.

| Trigger | Immediate action | Reconciliation requirement |
|---|---|---|
| Login, API, or asset failure | Route traffic back to blue; preserve green logs and revision ID | Record affected requests and investigate in staging |
| Data mismatch | Stop write operations; keep source/target evidence; revert traffic if needed | Compare approved export, post-cutover writes, and target rows before any replay |
| PDF/report regression | Revert traffic/revision; retain failing input and rendered output securely | Re-run rendering test before a new release |
| Integration authorization issue | Disable only the affected integration and show its truthful unavailable state | Do not fabricate a fallback value or silently reuse stale data |
| DNS/certificate issue | Revert DNS route according to the preapproved runbook | Confirm TLS and hostname behavior after recovery |

No force-push, destructive database reset, secret disclosure, or deletion of the Manus environment is part of the rollback plan.

## 11. Operational handover

Before UWS declares the migration complete, deliver the following controlled artifacts to the UWS owner: infrastructure-as-code or an equivalent repeatable environment specification; deployment runbook; secret inventory without values; data/asset migration manifests; database restore runbook; DNS/certificate instructions; provider/account ownership register; audit/alerting guide; integration-specific runbooks; and an incident/rollback contact list.

The team should also agree on change-control rules: all production changes use a reviewed GitHub pull request, a tagged release, test/build evidence, and a recorded rollback point. Direct production edits should be treated as emergencies and documented afterward.

## 12. Decisions needed from Dave/UWS before implementation

| Decision | Why it is needed |
|---|---|
| Approve external migration | This plan intentionally does not create external infrastructure or move data without approval |
| Select UWS cloud/account owner | Determines billing, IAM, audit ownership, and access recovery |
| Select final production hostname | Required for DNS, cookies, SSL, and future GBP OAuth callback registration |
| Choose authentication approach | Required to replace both Manus OAuth and the insecure client-only credential map |
| Approve backup retention and access owners | Required before copying database records or stored reports/assets |
| Approve AI/image provider ownership | Determines which direct vendor keys and fallbacks remain active after migration |
| Confirm Google/GBP activation timing | GBP must remain disabled until Google approves case `6-1216000040949` and a UWS operator authorizes it |

## 13. Practical outcome

The code is not trapped: the core React/Express/tRPC/Drizzle application and Docker workflow are portable. The migration effort is primarily about **replacing managed platform adapters**—storage, identity, secrets, deployment, and selected Forge fallbacks—and proving that UWS owns the resulting operational controls. The safest approach is a parallel staging build followed by a reversible blue/green cutover, not a rushed one-day rewrite.

## References

[1]: https://cloud.google.com/run/docs/deploying "Google Cloud: Deploy container images to Cloud Run services"
[2]: https://cloud.google.com/run/docs/configuring/services/secrets "Google Cloud: Configure secrets for services"
[3]: https://cloud.google.com/sql/docs/mysql/connect-run "Google Cloud: Connect from Cloud Run to Cloud SQL for MySQL"
