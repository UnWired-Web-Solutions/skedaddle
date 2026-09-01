# Live Google Business Profile Integration Research

**Reviewed:** August 31, 2026

## Official requirements

Google requires OAuth 2.0 for Business Profile API requests. The supported scope is `https://www.googleapis.com/auth/business.manage`; the older `plus.business.manage` scope is deprecated. For offline server-side imports, the application should request offline access and store a refresh token securely so it can obtain new access tokens without the user being signed in.

Official OAuth guide: https://developers.google.com/my-business/content/implement-oauth

Google also requires Business Profile API access approval for the Google Cloud project. Applicants must manage a verified, active Business Profile for at least 60 days, have a website for that profile, create a Business Profile organization account, and submit the basic API access form using an email that is an owner or manager of the profile. Google states that a quota of 0 requests per minute means the project is not approved, while 300 requests per minute indicates approval.

Official prerequisites: https://developers.google.com/my-business/content/prereqs

## APIs and endpoints

The Business Profile Account Management API lists accounts at:

`GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`

The Business Information API lists locations for an account. Google documents the `accounts/-/locations` wildcard to include locations managed indirectly through a group:

`GET https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title,storeCode,websiteUri,storefrontAddress,metadata,openInfo`

Official location guide: https://developers.google.com/my-business/content/location-data

The Business Profile Performance API service endpoint is:

`https://businessprofileperformance.googleapis.com`

The relevant endpoints are:

- `GET /v1/{location=locations/*}:fetchMultiDailyMetricsTimeSeries`
- `GET /v1/{name=locations/*}:getDailyMetricsTimeSeries`
- `GET /v1/{parent=locations/*}/searchkeywords/impressions/monthly`

Official performance reference: https://developers.google.com/my-business/reference/performance/rest

## Initial implementation decision

The first production version should use a user-authorized OAuth refresh token, a complete live location inventory, an explicit location-to-territory registry, monthly persistence with import audit records, and a manual refresh control. Recurring background imports should be added only after the live flow, quotas, coverage, and historical metric behavior are verified end to end.

## UWS Google Cloud verification

An authenticated review of project `uws-gbp-analytics` confirmed that the following required services are already enabled:

- Business Profile Performance API
- My Business Account Management API
- My Business Business Information API

The remaining access checks are the Business Profile Performance API quota/approval status, OAuth client suitability for offline `business.manage` access, and the live Skedaddle account/location inventory.

### Quota result

The authenticated Business Profile Performance API quota page shows **Requests per minute = 0** for project `uws-gbp-analytics`. Under Google's official prerequisites, this means the project is enabled but **not yet approved for GBP API access**. Live Performance API requests cannot succeed until Google grants basic API access and assigns a nonzero quota. The official application is available from Google's prerequisites page and Business Profile API access form.

## UWS Business Profile Manager access

The authenticated UWS account can access Business Profile Manager at https://business.google.com/locations. The account currently shows **65 total businesses**, including **55 verified**, **10 unverified**, four permanently closed, one disabled, and three suspended. The available business groups are `Ungrouped`, `Chipps Tree Care`, `Handyman Connection`, `SKEDADDLE WILDLIFE`, and `UWS Universal`.

The unfiltered location inventory includes numerous Skedaddle Humane Wildlife Control profiles across Canada and the United States. Visible Skedaddle identifiers and coverage areas include Ottawa, Montreal/Laval, Durham, London, Windsor, Barrie/York, Hamilton, Niagara, Peterborough, Belleville, Sudbury, Halifax, Truro, Atlanta, Baltimore/Towson, Maryland, Denver, Columbus, and Pittsburgh. The next step is to filter to the `SKEDADDLE WILDLIFE` group and capture the authoritative location identifiers, statuses, and territory mapping.

### Current Skedaddle profile inventory

Business Profile Manager exposes **32 Skedaddle profiles** in the UWS account. Twenty-nine are verified and three require exclusion or review because they are permanently closed or not verified.

| Shop code / visible identifier | Coverage label | Current status | Proposed portal territory |
|---|---|---|---|
| blank | Belleville / Prince Edward / Trenton | Published; permanently closed | Ottawa — exclude from current live totals pending confirmation |
| blank | Bowie / Arnold and surrounding areas | Verified | Baltimore |
| 05487409052313605925 | Towson / Dundalk and surrounding areas | Verified | Baltimore |
| 07191039821340075907 | Arvada / Aurora and surrounding areas | Verified | Denver |
| 08501327997348826881 | Obetz / Dublin and surrounding areas | Verified | Columbus |
| 1 | Ancaster address | Verified | Hamilton |
| 11549891598088423237 | Imperial / Hookstown and surrounding areas | Verified | Pittsburgh |
| 11631462055787707296 | Olney / Laurel and surrounding areas | Verified | Maryland Central |
| 11974700586889312946 | Essex / LaSalle and surrounding areas | Verified | Windsor |
| 12 | York / Toronto and surrounding areas | Verified | Toronto |
| 13465152855530330435 | Atlanta / Decatur and surrounding areas | Verified | Atlanta North |
| 19 | Ottawa / Arnprior and surrounding areas | Verified | Ottawa |
| 2 | Grimsby / Lincoln and surrounding areas | Verified | Niagara |
| 20 | Laval / Hudson and surrounding areas | Verified | Montreal |
| 21 | Lower Sackville address | Verified | Halifax |
| 22 | Truro address | Verified | Halifax / Truro — review territory treatment |
| 23 | Greater Sudbury | Verified | Sudbury — not yet represented in the portal’s canonical 19 territories |
| 24 | Aurora / Barrie and surrounding areas | Verified | Barrie / York Region |
| 25 | London / Ingersoll and surrounding areas | Verified | London |
| 26 | Ajax / Oshawa and surrounding areas | Verified | Durham |
| 27 | Lakefield / Campbellford and surrounding areas | Verified | Ottawa / Peterborough — review territory treatment |
| 3 | Brant / Delhi and surrounding areas | Verified | Hamilton / Brantford — review territory treatment |
| 30 | Katy / Manvel and surrounding areas | Verification required; permanently closed | Houston — exclude |
| 32 | Madison / DeForest and surrounding areas | Verified | Madison |
| 33 | Delta / Anmore and surrounding areas | Verified | Coquitlam |
| 34 | Oliver / Vernon and surrounding areas | Verified | Okanagan |
| 35 | Erin / Bolton and surrounding areas | Verified | Orangeville |
| 38 | Duncan / Colwood and surrounding areas | Published; permanently closed | Vancouver Island — exclude |
| 5 | Ayr / Baden and surrounding areas | Verified | Kitchener / Waterloo — not yet represented in the portal’s canonical 19 territories |
| 6 | Milton / Brampton and surrounding areas | Verified | Mississauga — review against current canonical territories |
| 865343 | Wales / Hartland and surrounding areas | Verified | Milwaukee |
| 16834354687722739934 | Minneapolis / Anoka / Orono and surrounding areas | Verified | Minneapolis |

The visible Business Profile Manager table shows identifiers from the `Shop code` column, not the API resource names required by the Performance API. Once Google approves a nonzero API quota, the Account Management and Business Information APIs must supply the authoritative `accounts/{accountId}` and `locations/{locationId}` resources before any metrics are imported.

## API access application status

Google's official Business Profile API support form was opened under the authenticated UWS account. No request has been submitted. The form begins with a required “What can we help with?” selector; its dynamically loaded state reset during inspection, so the application category and remaining fields still need to be reviewed before requesting user approval to submit.

Google’s current direct application route is https://support.google.com/business/workflow/16726127?hl=en. It confirms that the request is for access to manage Business Profiles at scale. The help-site session is separate from the Business Profile Manager session and currently requires a fresh UWS sign-in before it reveals the application form. No request fields or submission controls have been completed.

After successful UWS sign-in, the form is at **15%** and requires the applicant to select one Business Profile. Google states that the selected profile must be **verified** and **active for at least 60 days** to allowlist a project. The visible selector includes the verified Skedaddle profiles previously inventoried, including the uniquely labelled `Skedaddle Humane Wildlife Control - Minneapolis`, plus many service-area listings with the generic Skedaddle name. The form has not advanced and the `Continue` action remains disabled until a profile is selected.

The selector's field accepts text but did not filter when given the unverified `name:` prefix. No profile has been selected. Selection will therefore be made only from a visible verified row, avoiding any assumption about undocumented filter syntax.

The verified **Skedaddle Humane Wildlife Control - Minneapolis** service-area profile was selected as the application anchor. This is a uniquely labelled verified Skedaddle profile and was chosen only to satisfy Google's allowlisting application; it does not limit the later API location inventory or territory mapping. The application has not advanced or been submitted.

The application is now at **50%** and requests four required fields:

1. Google Cloud project number
2. Company website
3. How UWS learned about the access form
4. The primary reason for seeking access

Planned factual request description: UWS is building an internal, access-controlled performance dashboard for Skedaddle franchise territories. The system will read authorized Google Business Profile performance metrics, persist verified historical results with source periods and import timestamps, and present territory-level operational reporting. It will begin with manual administrative refreshes; no end-user product, public data display, or data resale is planned. No field values have been entered and no application has been submitted.

The form is now populated but **not submitted** with:

- Google Cloud project number: `48421835546` (`uws-gbp-analytics`)
- Company website: `https://unwiredwebsolutions.com`
- Discovery source: `Google Business Profile API documentation`
- Primary reason: the factual internal UWS/Skedaddle reporting-dashboard statement above

The next action is only to review the final Google application step; it is not an authorization, quota change, or request submission.

After selecting `Continue`, Google left the application at 50% with an in-form loading indicator and no visible error or next fields. No request was submitted. The next step is diagnostic inspection of the form state and validation errors before retrying any navigation.

## Allowlist Application Submitted

Google completed the official application and confirmed **Opened a support case**:

- **Case ID:** `6-1216000040949`
- **Project:** `uws-gbp-analytics` / project number `48421835546`
- **Anchor profile:** Verified `Skedaddle Humane Wildlife Control - Minneapolis`
- **Google’s stated review time:** Approximately **7–10 business days**

The Business Profile and Performance APIs remain enabled, but the Performance API retains a zero approved request quota until Google completes its allowlist review. No live API calls should be represented as available before nonzero quota and authorized response data are verified.

The remaining technical prerequisites after allowlisting are an OAuth 2.0 user authorization with the `https://www.googleapis.com/auth/business.manage` scope, exact live location inventory, explicit location-to-territory mapping, and an end-to-end importer validation. No customer-facing GBP metrics have been changed.

## Critical Business Profile access notice

While signed in as `uws@unwiredwebsolutions.com`, Google Business Profile Help displays a critical notice that access to the account's Business Profile has been suspended for guideline noncompliance and directs the account owner to take corrective action. The Business Profile Manager remains visible and lists locations, but this suspension may affect API eligibility and location-management access.

No appeal, reinstatement, profile edit, or other remedial action has been submitted. Before requesting API access or building live imports, determine whether the suspension applies to the overall UWS manager account or one specific Business Profile and obtain explicit approval before taking any corrective action.
