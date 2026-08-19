# Google Analytics 4 Access Status

## Date: Aug 19, 2026

## Account: uws@unwiredwebsolutions.com

### Current Access
The UWS Google account has GA4 access. On login it loaded into:
- **Account:** UnWired Web Solutions (a240568285)
- **Property:** Apple Butter & Cheese Festival (p331146787)

This is a UWS client property, NOT the Skedaddle Wildlife property.

### Skedaddle Wildlife GA4 Property
- **Account ID:** 39401450
- **Status:** ACCESS CONFIRMED — UWS account has full access to the Skedaddle Wildlife GA4 account
- **Key finding:** Skedaddle uses SEPARATE GA4 properties per territory (not one unified property)
- **Previous blocker resolved:** Property p394014501 was the wrong ID. The actual properties are listed below.

### Discovered GA4 Properties (all accessible):

| Property Name | Property ID | Territory |
|---|---|---|
| Skedaddle Wildlife Pickering - GA4 | 386412751 | Durham (Pickering sub-market) |
| Skedaddle Wildl... | 475791585 | TBD — needs investigation |
| Skedaddle Wildl... | 487034337 | TBD — needs investigation |
| Skedaddle Wildl... | 426814229 | TBD — needs investigation |
| Skedaddle Wildl... | 386492593 | TBD — needs investigation |
| (additional properties) | ... | TBD — scroll to see all |

### Pickering Property (386412751) — Verified Data:
- Active users last 7 days: 132
- Top pages: bat content, rodent content, raccoon content, skunk content (all Pickering-specific)
- Traffic: 91 organic search, 48 direct, 0 organic social
- Top countries: US (63), Singapore (33), Canada (13)

### GA4 Data API
- **Status:** ENABLED in the UWS Google Cloud project (uws-gbp-analytics)
- **Service name:** analyticsdata.googleapis.com
- **Enabled:** Aug 19, 2026

### Next Steps
1. ~~Open the GA4 property picker to check if Skedaddle Wildlife is accessible~~ ✅ DONE — accessible
2. Navigate to each property to identify which territory it covers (map property IDs to territories)
3. Add the service account email as a viewer on each property for API access
4. Update the GA4 client to query the correct property per territory (not one unified property)
5. Build territory-filtered GA4 importer using the per-territory property mapping
