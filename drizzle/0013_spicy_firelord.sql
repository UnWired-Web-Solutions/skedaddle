ALTER TABLE `salesforce_workbook_import_runs` ADD `driveVersion` varchar(32);--> statement-breakpoint
ALTER TABLE `salesforce_workbook_import_runs` ADD `driveModifiedAt` varchar(40);--> statement-breakpoint
ALTER TABLE `salesforce_workbook_sources` ADD `lastDriveVersion` varchar(32);--> statement-breakpoint
ALTER TABLE `salesforce_workbook_sources` ADD `lastDriveModifiedAt` varchar(40);
