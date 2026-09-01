ALTER TABLE `salesforce_workbook_sources` ADD `importLockToken` varchar(64);--> statement-breakpoint
ALTER TABLE `salesforce_workbook_sources` ADD `importLockAcquiredAt` timestamp;--> statement-breakpoint
ALTER TABLE `salesforce_workbook_sources` ADD `lastCheckedAt` timestamp;--> statement-breakpoint
ALTER TABLE `salesforce_workbook_sources` ADD `lastError` text;