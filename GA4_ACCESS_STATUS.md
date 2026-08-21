# Google Analytics 4 Access Status

## Date: Aug 20, 2026
## Status: FULLY CONNECTED ✅

## Account: uws@unwiredwebsolutions.com

### Access Summary
- **GA4 Account:** Skedaddle Wildlife (39401450)
- **Total Properties:** 129 sub-location properties mapped to 19 franchise territories
- **Service Account:** skedaddle-search-console-reade@uws-gbp-analytics.iam.gserviceaccount.com
- **Service Account Role:** Administrator (account-level, cascades to all 129 properties)
- **Access Granted Via:** Analytics Admin API — `accounts/39401450/accessBindings` (GA4 UI does not accept service account emails)
- **APIs Enabled:** GA4 Data API (analyticsdata.googleapis.com) + Analytics Admin API (analyticsadmin.googleapis.com)

### How Access Was Granted
1. GA4 web UI rejects service account emails ("This email does not match a Google account")
2. Enabled the Analytics Admin API in the uws-gbp-analytics Google Cloud project
3. Used Google's API Explorer (https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1alpha/accounts.accessBindings/create)
4. Authorized as uws@unwiredwebsolutions.com (Org Admin on the account)
5. POST to accounts/39401450/accessBindings with the service account email and predefinedRoles/admin
6. Key gotcha: service account email is truncated — `reade` not `reader` (Google Cloud 30-char limit)

### Live Data Verified
- Ottawa: 1,887 sessions (Jan–Jul 2026)
- Minneapolis: 1,004 sessions (Jan–Jul 2026)
- Pickering: 614 sessions from US, 212 from Canada (Jul 2025)

### Territory Property Mapping
Full mapping in: `shared/ga4TerritoryProperties.ts`
- 19 territories, each with 1–16 sub-location GA4 properties
- Aggregation handled by `server/googleAnalyticsClient.ts`

### Dashboard Integration
- Live GA4 panels on Analytics page: Top Pages, Top Cities, Channel Breakdown
- 5 tRPC procedures: getGA4TerritoryMonthly, getGA4TerritoryTopPages, getGA4TerritoryTopCities, getGA4TerritoryChannelBreakdown, getGA4ReadyTerritories

### UWS Account Permissions on Skedaddle Wildlife GA4
- uws@unwiredwebsolutions.com — Org Admin, Administrator
- nickshewchuk@humanewildlifecontrol.com — Administrator
- raafter68@gmail.com — Administrator
- RyanRainville@humanewildlifecontrol.com — Lower-level permissions
