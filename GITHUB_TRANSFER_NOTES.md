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
- Pre-transfer main commit before the transfer-tracking checkpoint: `39e8b00ce6ee6bb4fd2bac2a194e136bd1b0cbda`
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

## Preservation Requirements

1. Use GitHub's repository ownership-transfer function rather than copying files into a new repository, so commit history, branches, issues, and pull requests are preserved.
2. Do not delete or rename `aybello/skedaddle` until the source inventory is checkpointed and the user explicitly confirms the destructive destination deletion and ownership transfer.
3. After transfer acceptance, update the local `user_github` remote and reconnect the Manus project if GitHub App access does not follow automatically.
4. Verify `main`, all four supporting branches, PRs #1–#3, pull/push access, auto-publish, and `https://skedaddle.manus.space` after the transfer.
5. Never store GitHub or Google passwords, tokens, or session credentials in this file or the repository.
