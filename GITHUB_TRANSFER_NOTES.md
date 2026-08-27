# GitHub Repository Ownership Transfer

## Objective

Transfer the populated repository from `aybello/skedaddle` to the authenticated UWS GitHub account `uws-dev` without losing repository history, branches, pull requests, or the Manus project connection.

## Confirmed Accounts

| Role | GitHub account | Evidence |
|---|---|---|
| Current owner | `aybello` | Source repository API metadata and admin permission check |
| UWS destination | `uws-dev` | Authenticated browser session for `uws@unwiredwebsolutions.com` |

## Source Repository Inventory

- Canonical source: `https://github.com/aybello/skedaddle`
- Visibility: Public
- Default branch: `main`
- Source owner permissions: Admin confirmed
- Synchronized pre-transfer main commit: `0400ee857c92f924e736b61c6b39955e607ae22e`
- Manus pre-transfer checkpoint: `0400ee85`
- Repository size reported by GitHub: 903 KB
- Tags: None

### Branches

| Branch | Commit |
|---|---|
| `main` | `39e8b00ce6ee6bb4fd2bac2a194e136bd1b0cbda` |
| `agent/analytics-report-integration` | `52f460b1fce4509a23566f00245c94ab9cb319a4` |
| `agent/gbp-image-workflow-repair` | `9b7a18f0068ea30dcbbb18ccee84909ca9319339` |
| `codex/meeting-report-priorities` | `4cc28c0fba2d922a229b3481007e3b1a27d7feb8` |
| `codex/product-coherence-reporting` | `8413ba6c02450b2d53823a8a0e505db274eaa1e9` |

### Pull Requests

| PR | State | Title |
|---|---|---|
| #1 | Merged | Fix product data and report coherence |
| #2 | Merged | Align dashboards with reporting decisions |
| #3 | Open | Repair GBP image generation and approval workflow |

## Destination Conflict

`uws-dev/skedaddle` already exists but is an empty public repository with no commits, issues, or pull requests. GitHub cannot transfer the populated source repository while the destination name exists. The empty repository must therefore be deleted immediately before initiating the ownership transfer.

Ay's authenticated GitHub identity has confirmed administrator permission on `aybello/skedaddle`. The authenticated UWS browser session is signed in as `uws-dev` and exposes repository Settings for the empty destination repository. The destination name will therefore be eligible immediately after the empty repository is deleted.

The authenticated `uws-dev` settings page exposes the repository Danger Zone and deletion control, confirming owner-level control of the empty placeholder. Ay explicitly authorized deleting the empty repository and transferring the populated source repository without renaming the placeholder.

Deletion workflow initiated for the verified empty `uws-dev/skedaddle` placeholder. GitHub's confirmation dialog independently reports 0 stars and 0 watchers and identifies the repository slated for deletion as `uws-dev/skedaddle`; the populated source and validated mirror backup remain unchanged.

GitHub's deletion workflow has reached the final exact-name confirmation step for `uws-dev/skedaddle`. No source-repository operation has been performed yet.

The final deletion button remains disabled until GitHub's controlled input receives the exact repository name. The empty repository is still present at this checkpoint in the browser workflow.

The final GitHub safeguard now contains the exact value `uws-dev/skedaddle`; the next action submits deletion of only the verified empty placeholder.

GitHub's controlled validation has not yet enabled the submit button despite the visible exact text, so deletion has not occurred. The next step is to trigger the native keyboard validation event and re-check the enabled state before submission.

After re-focusing and re-entering the exact repository name through the browser field, the final delete action still did not submit. The empty placeholder remains intact; no ownership transfer has started.

## Empty Placeholder Removal

GitHub confirmed: `uws-dev/skedaddle` was successfully deleted. The authenticated UWS account now has no public repositories and the `uws-dev/skedaddle` destination name is available. The populated `aybello/skedaddle` source repository and validated mirror backup remain intact at this point.

## Transfer API Permission Block

The authenticated command-line integration returned `403 Resource not accessible by integration` when calling GitHub's repository-transfer API. GitHub reported that `administration=write` permission is required. No source change occurred. The transfer must therefore be initiated through an authenticated `aybello` browser session, then accepted from the authenticated `uws-dev` session if GitHub requests acceptance.

The authenticated `uws-dev` browser session receives a GitHub 404 when opening `aybello/skedaddle/settings`, confirming it does not have source-admin access before transfer. The account menu is open and ready to sign out so the source owner can authenticate.

The `uws-dev` GitHub session has been signed out. The browser is now open at GitHub's login page with a return path to `aybello/skedaddle/settings`, ready for source-owner authentication.

## Source-Owner Transfer Form

Ay authenticated successfully as `aybello`. GitHub exposes the populated `aybello/skedaddle` settings and transfer form, confirming source-owner administration. The transfer form supports a free-form new owner and requires the exact confirmation text `aybello/skedaddle`. GitHub notes that the new owner may need to approve the transfer.

The source-owner transfer form is now populated with new owner `uws-dev` and exact confirmation `aybello/skedaddle`. The next browser action submits the user-approved ownership transfer.

GitHub confirmed: **Repository transfer to `uws-dev` requested.** The source settings now show “This repository is being transferred to @uws-dev” with an Abort transfer control. The source remains intact while UWS acceptance is completed.

The browser is now at GitHub's logout confirmation for `aybello`. After signing out, `uws-dev` will authenticate to accept and verify the pending transfer.

The `aybello` GitHub session has been signed out. The browser is now at GitHub login with a return path to `uws-dev/skedaddle`, ready for the receiving UWS account to authenticate and complete acceptance.

The UWS Google account has been selected for GitHub authentication. Google requires device verification: approve the prompt and select **90**. The browser is waiting at this verification checkpoint.

## Transfer Accepted and Ownership Verified

The user accepted the transfer through GitHub's email link. GitHub's public API now reports:

- Canonical repository: `uws-dev/skedaddle`
- Owner: `uws-dev`
- Default branch: `main`
- Repository size: 903 KB
- Old `aybello/skedaddle` API URL: `Moved Permanently`
- Preserved branches: `main`, `agent/analytics-report-integration`, `agent/gbp-image-workflow-repair`, `codex/meeting-report-priorities`, `codex/product-coherence-reporting`
- Preserved pull requests: #1 and #2 closed; #3 open

The ownership transfer is complete. Remaining work is to verify `aybello` permissions, update the Manus remote, test push/pull and checkpoint publishing, and confirm production health.

## Initial Post-Transfer Access Check

GitHub identifies the authenticated personal account as `aybello`. On `uws-dev/skedaddle`, Ay currently has pull, triage, and push permissions, but not administrator permission. The local `user_github` remote still points to the old `aybello/skedaddle` path; GitHub redirects that path and returns the correct synchronized `main` commit `0400ee857c92f924e736b61c6b39955e607ae22e`. The next step is to update the canonical remote and attempt to restore Ay's promised administrator access from the transferred repository's integration.

## Canonical Remote and Integration Verification

- The local `user_github` remote now points directly to `uws-dev/skedaddle`.
- Fetch/read access succeeds and `main` remains synchronized at `0400ee857c92f924e736b61c6b39955e607ae22e`.
- All five branches and pull requests #1–#3 remain present.
- `aybello` retains pull, triage, and push access, but not administrator permission.
- The existing `manus-connector[bot]` can fetch but cannot push after the transfer. GitHub returns `403 Permission to uws-dev/skedaddle.git denied to manus-connector[bot]`.
- The Manus GitHub App must be authorized for the transferred UWS repository before checkpoint auto-sync is fully restored.

## Authorization Restored

After the user re-authorized GitHub for `uws-dev/skedaddle`, the project integration reports full repository administration permission. The local remote credential was refreshed from the renewed integration and `git push --dry-run user_github main` completed successfully with `Everything up-to-date`.

Using the renewed UWS repository administration permission, `aybello` was explicitly restored to **Admin** access. A fresh permission check from Ay's authenticated account confirms admin, maintain, push, triage, and pull access.

## Final Synchronization and Production Verification

- Verified migration checkpoint before the final records update: `c61eecc9`
- Local `main` and `uws-dev/skedaddle` `main` were verified synchronized at `c61eecc9e690af4acffeafb584516c27a243a0a7`; the later documentation-only checkpoint was also pushed and verified separately.
- GitHub push to the transferred repository completed successfully.
- All five branches remain present.
- Pull requests #1 and #2 remain merged; PR #3 remains open.
- TypeScript passed; 99 tests passed with 10 intentional skips; production build passed.
- `https://skedaddle.manus.space/` returned HTTP 200 after auto-publishing.

## Recovery Backup

A complete mirror clone was created at `/home/ubuntu/backups/skedaddle-pretransfer.git`. `git fsck --full` completed successfully across 1,181 objects. The mirror contains all five branches and pull-request refs for PRs #1–#3. Local `main`, GitHub `main`, and the mirror's `main` all resolve to `0400ee857c92f924e736b61c6b39955e607ae22e`.

## Preservation Requirements

1. Use GitHub's repository ownership-transfer function rather than copying files into a new repository, so commit history, branches, issues, and pull requests are preserved.
2. Do not delete or rename `aybello/skedaddle` until the source inventory is checkpointed and the user explicitly confirms the destructive destination deletion and ownership transfer.
3. After transfer acceptance, update the local `user_github` remote and reconnect the Manus project if GitHub App access does not follow automatically.
4. Verify `main`, all four supporting branches, PRs #1–#3, pull/push access, auto-publish, and `https://skedaddle.manus.space` after the transfer.
5. Never store GitHub or Google passwords, tokens, or session credentials in this file or the repository.
