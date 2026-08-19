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
- **Property ID:** p394014501
- **Status:** VISIBLE in the property picker but ACCESS DENIED — "You do not have access to the account or property"
- **Blocker:** UWS account can see the Skedaddle Wildlife account in the picker (account 39401450) but does NOT have viewer permission on the GA4 property (p394014501). Need an admin of the Skedaddle Wildlife GA4 property to grant Viewer access to uws@unwiredwebsolutions.com AND the service account email.
- **Action required:** Ask Dave/Nina/Ares to add uws@unwiredwebsolutions.com as a Viewer on the Skedaddle Wildlife GA4 property (p394014501), and also add skedaddle-search-console-reader@uws-gbp-analytics.iam.gserviceaccount.com as a Viewer for API access.

### GA4 Data API
- **Status:** ENABLED in the UWS Google Cloud project (uws-gbp-analytics)
- **Service name:** analyticsdata.googleapis.com
- **Enabled:** Aug 19, 2026

### Next Steps
1. Open the GA4 property picker to check if Skedaddle Wildlife is accessible
2. If not accessible, need to request viewer access from Ares/Nina/Dave
3. If accessible, add the service account email as a viewer on the GA4 property
4. Build the GA4 client similar to the Search Console client
