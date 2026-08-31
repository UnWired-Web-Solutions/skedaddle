# Salesforce Data Sync Folder Review

**Folder:** [Salesforce Data Sync][1]  
**Reviewed:** August 31, 2026  
**Access result:** All six files are readable. The folder contains five Google Sheets and one Google Doc, with no subfolders.

## Contents at a glance

| File | What it contains | Verified scope |
|---|---|---|
| [Minneapolis Neighbourhood Content Test - Jun-Aug 2026][2] | Postal-code and street summaries for Minneapolis, intended to identify neighbourhood-level job and revenue patterns | 133 postal-code rows and 715 street rows covering June–August 2026 |
| [Ottawa Mice Sales — Monthly, 3yr][3] | Monthly mice appointments, invoiced jobs, revenue, and revenue per invoiced job | 39 monthly rows from August 2023 through October 2026 |
| [Salesforce Data][4] | The master Salesforce work-order dataset plus Kitchener summary tabs | 269,890 current data rows read through the Sheets API; 14 populated raw fields; five worksheets |
| [Salesforce Data — Status Values (Column B)][5] | A frequency table for the Salesforce Status field | 16 statuses; document states 269,917 rows at the time it was generated |
| [Territory Sales - Mar-Jul 2024-2026][6] | Territory-by-month appointments, invoiced jobs, and revenue | 393 data rows; 30 territory labels; March–July in 2024, 2025, and 2026 |
| [Waterloo Region Cross-Check][7] | Kitchener-territory city performance and species year-over-year comparisons | 52 city rows and 30 species rows; trailing 12 months September 2025–August 2026 |

## 1. Minneapolis neighbourhood content test

The Minneapolis workbook aggregates June–August 2026 activity two ways: first by postal code, then by street. The postal table contains **1,657 jobs**, while the street table contains **1,656 jobs**. Both report **$673,811.96** in total revenue and **873 distinct addresses**, indicating the two views reconcile on revenue and address count but differ by one job.[2]

Bats are the most common `TopSpecies` value in both tables, followed by mice and squirrels. The workbook also contains **17 `Unknown Species` rows**, **six rows where `Insulation` is treated as a species**, **40 postal-code rows with zero or negative revenue**, and **497 street rows with zero or negative revenue**. Those rows should be handled explicitly before using the sheet to prioritize neighbourhood content.[2]

## 2. Ottawa mice sales

This workbook follows the Ottawa mice sales funnel from appointment to invoiced job and revenue. Across the 39 monthly rows, it contains **3,451 appointments**, **756 invoiced jobs**, and **$721,780.68** in reported revenue.[3]

The highest-revenue month is **October 2023**, with **$45,026.80** from 32 invoiced jobs. The highest appointment month is **November 2025**, with 161 appointments. The highest reported revenue per invoiced job is **$2,563.99 in July 2024**.[3]

August 2023, September 2026, and October 2026 contain appointments but no invoiced jobs or revenue. The last two months appear to be forward or incomplete periods and should not be treated as finalized performance without confirmation.[3]

## 3. Salesforce master data

The master `Salesforce Data` sheet is larger than Google Drive's 10 MB export limit, so its full contents were read through the Sheets API in six ranges. The current sheet contains **269,890 unique work-order IDs** with no duplicate IDs detected.[4]

The raw table exposes these 14 populated fields:

`Id`, `Status`, `SchedStartTime`, `LastModifiedDate`, `CreatedDate`, `Street`, `City`, `PostalCode`, `ServiceTerritory.Name`, `WorkType.Name`, `Service_Territory_SA_textfield__c`, `salesperson_new__c`, `Species__c`, and `Invoice_pre_tax_amount__c`.[4]

The current `CreatedDate` range is August 17, 2020 through August 31, 2026. Scheduled dates run from December 26, 2022 through July 5, 2027, reflecting both historical and future-scheduled work.[4]

| Master-data measure | Verified value |
|---|---:|
| Current rows / unique IDs | 269,890 |
| Completed-like rows* | 225,801 |
| Distinct status values | 16 |
| Service-territory values, including blank | 34 |
| City values, including blank | 1,787 |
| Species values, including blank | 37 |
| Work-type values, including blank | 66 |
| Nonblank invoice rows | 91,676 |
| Positive invoice rows | 83,563 |
| Zero invoice rows | 7,698 |
| Negative invoice rows | 415 |

\*Completed-like includes `Completed`, both `Compl.DoJobsche...` statuses, and the one `Completed - Do Job scheduled after PA date` row. This grouping still requires business confirmation.

The most common species values by record count are **Mice (68,296)**, **Squirrels (42,394)**, **Raccoons (42,307)**, **Pest - Commercial Account (24,517)**, and **Bats (19,861)**.[4]

The sheet includes street addresses and salesperson names. It should therefore be treated as sensitive operational data and should not be exposed in public-facing reports or client downloads.

### Kitchener summary tabs

The master workbook also contains four prepared Kitchener views. Its summary reports **$3,377,020.28** in pre-tax revenue across **8,826 jobs** from August 2023 through August 2026, filtered to `Completed`, `Compl.DoJobsche.duringPA`, and `Compl.DoJobsche.afterPA`.[4]

Raccoons lead Kitchener revenue at **$1,005,164.47**, followed by mice at **$642,865.31** and squirrels at **$633,575.91**. Guelph is the leading city in the prepared all-period city table at **$1,043,229.89**, followed by Kitchener at **$734,076.72**, Waterloo at **$554,884.48**, and Cambridge at **$550,039.90**.[4]

## 4. Salesforce status-value document

The document lists 16 status values. Its largest categories are `Completed` (190,540), `Compl.DoJobsche.duringPA` (21,594), `Lost Quote` (19,811), `Compl.DoJobsche.afterPA` (13,671), and `Quote Follow Up` (11,141).[5]

The source explicitly warns that `Compl.DoJobsche.duringPA` and `Compl.DoJobsche.afterPA` appear to be internal Salesforce automation shorthand. **Kyra should confirm whether these count as completed/closed jobs before the portal calculates close rates or completed-job totals.**[5]

The status document says it covers 269,917 rows, while the later-modified live master sheet currently returns 269,890 rows. Several individual status counts also differ slightly. The status document should therefore be treated as a snapshot, and the live master sheet should be re-profiled whenever the portal imports it.[4] [5]

## 5. Territory sales, March–July 2024–2026

This workbook contains **110,015 appointments**, **35,540 invoiced jobs**, and a raw revenue sum of **$33,172,620.89** across 393 territory-month rows.[6]

The largest single territory-month entry is **D - Durham in May 2024**, with 1,274 appointments, 550 invoiced jobs, and $316,290.70 in reported revenue. Across the full file, D - Durham has the highest raw revenue total, followed by H - Hamilton, Ottawa West, Ottawa, and H - Niagara.[6]

The file mixes Canadian and U.S. territory labels but contains **no currency column**. The $33.17 million total and territory rankings should not be used as a consolidated cross-country financial result unless currency is confirmed or normalized.[6]

## 6. Waterloo Region cross-check

The trailing-12-month city table shows Guelph leading at **$398,476.28**, followed by Kitchener at **$267,301.39**, Cambridge at **$198,820.75**, and Waterloo at **$191,851.12**.[7]

At the species level, raccoons lead at **$400,592.24**, up 22.9% year over year, followed by squirrels at **$223,960.04**, up 14.4%. Mice revenue declined 29.3% and mice jobs declined 21.7%. Bat revenue increased 68.4%, while red-squirrel revenue increased 121.8% from a smaller base.[7]

The workbook includes 11 city rows without AOV values, two ambiguous species rows (`Unknown Species` and `(unspecified)`), and several percentage comparisons marked `n/a (from 0)`. Those cases should remain explicitly unavailable rather than converted into invented percentages.[7]

## Recommended use in the portal

The folder provides enough real Salesforce-derived data to validate and populate territory sales, species, city, appointment, invoiced-job, and revenue reporting. The immediate data-definition dependency is Kyra's confirmation of which Salesforce status values constitute a completed or closed job. Currency handling is also required before Canadian and U.S. revenue can be aggregated.

These files can support the current dashboard while the direct Salesforce API connection is finalized, but they are snapshots. A live integration should retain import timestamps, source periods, status mapping, and currency rather than silently treating all rows as equivalent.

## References

[1]: https://drive.google.com/drive/folders/13JTaiAtXGY8q6bGzzEMdYwYnQw3LorIa?usp=sharing "Salesforce Data Sync folder"
[2]: https://docs.google.com/spreadsheets/d/19MEsnsVq5qJNt8RAgG3TuFoaHrDPkhoSi8T7HzD_dmw/edit "Minneapolis Neighbourhood Content Test - Jun-Aug 2026"
[3]: https://docs.google.com/spreadsheets/d/1Ph4Z6DqnXGd-n7A0BezaX0Ha2t5tPlmsOVyXsNKgIHo/edit "Ottawa Mice Sales — Monthly, 3yr"
[4]: https://docs.google.com/spreadsheets/d/1WUAlglCwg85OrH_Dqqqw7zRZNGKxOlBPwzHF5cqD6sQ/edit "Salesforce Data"
[5]: https://docs.google.com/document/d/1AgMsGNBgqGMEOj7nzVc0iWnU85Q7CslZCG0LsjlXo0E/edit "Salesforce Data — Status Values (Column B)"
[6]: https://docs.google.com/spreadsheets/d/1dwN7DI2p7cyGIQkn3Ur2e6qzil0UyCfGoeSMnouQA0M/edit "Territory Sales - Mar-Jul 2024-2026"
[7]: https://docs.google.com/spreadsheets/d/18pqtpr6fjiJ_Ha9sMA0rmM1st9zIdA9EzRagDSbrWsA/edit "Waterloo Region Cross-Check"
