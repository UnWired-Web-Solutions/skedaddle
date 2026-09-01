ALTER TABLE `salesforce_workbook_import_runs`
  MODIFY COLUMN `status` enum('running','complete','partial','failed','skipped') NOT NULL;
