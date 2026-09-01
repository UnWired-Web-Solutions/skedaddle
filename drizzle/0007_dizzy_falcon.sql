CREATE TABLE IF NOT EXISTS `gbp_import_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `importKind` enum('inventory','metrics') NOT NULL,
  `territoryId` varchar(64),
  `sourceStartDate` varchar(10),
  `sourceEndDate` varchar(10),
  `status` enum('complete','partial','failed') NOT NULL,
  `locationsExpected` int NOT NULL DEFAULT 0,
  `locationsSucceeded` int NOT NULL DEFAULT 0,
  `skippedLocationsJson` longtext,
  `failedLocationsJson` longtext,
  `errorMessage` text,
  `startedAt` timestamp NOT NULL DEFAULT (now()),
  `completedAt` timestamp,
  CONSTRAINT `gbp_import_runs_id` PRIMARY KEY(`id`),
  KEY `gbp_import_runs_territory_period_idx` (`territoryId`,`sourceStartDate`,`sourceEndDate`,`startedAt`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gbp_locations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `apiLocationName` varchar(255) NOT NULL,
  `accountName` varchar(255),
  `title` text NOT NULL,
  `storeCode` varchar(128),
  `websiteUri` text,
  `addressJson` json,
  `listingState` varchar(64),
  `verificationState` varchar(64),
  `territoryId` varchar(64),
  `mappingStatus` enum('ready','review_required','excluded','unmapped') NOT NULL,
  `mappingRationale` text,
  `firstSeenAt` timestamp NOT NULL DEFAULT (now()),
  `lastSeenAt` timestamp NOT NULL DEFAULT (now()),
  `lastInventoryRunId` int,
  CONSTRAINT `gbp_locations_id` PRIMARY KEY(`id`),
  CONSTRAINT `gbp_locations_apiLocationName_unique` UNIQUE(`apiLocationName`),
  KEY `gbp_locations_territory_mapping_idx` (`territoryId`,`mappingStatus`),
  KEY `gbp_locations_store_code_idx` (`storeCode`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gbp_daily_metrics` (
  `id` int AUTO_INCREMENT NOT NULL,
  `gbpLocationId` int NOT NULL,
  `metricType` varchar(96) NOT NULL,
  `metricDate` varchar(10) NOT NULL,
  `value` int NOT NULL,
  `sourceStartDate` varchar(10) NOT NULL,
  `sourceEndDate` varchar(10) NOT NULL,
  `importRunId` int NOT NULL,
  `importedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `gbp_daily_metrics_id` PRIMARY KEY(`id`),
  CONSTRAINT `gbp_daily_metrics_location_metric_date_idx` UNIQUE(`gbpLocationId`,`metricType`,`metricDate`),
  KEY `gbp_daily_metrics_import_run_idx` (`importRunId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gbp_territory_monthly` (
  `id` int AUTO_INCREMENT NOT NULL,
  `territoryId` varchar(64) NOT NULL,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `metricType` varchar(96) NOT NULL,
  `value` int NOT NULL,
  `coverageStatus` enum('complete','partial') NOT NULL,
  `locationsExpected` int NOT NULL,
  `locationsSucceeded` int NOT NULL,
  `sourceStartDate` varchar(10) NOT NULL,
  `sourceEndDate` varchar(10) NOT NULL,
  `importRunId` int NOT NULL,
  `importedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `gbp_territory_monthly_id` PRIMARY KEY(`id`),
  CONSTRAINT `gbp_territory_monthly_period_metric_idx` UNIQUE(`territoryId`,`year`,`month`,`metricType`),
  KEY `gbp_territory_monthly_coverage_idx` (`territoryId`,`coverageStatus`,`year`,`month`),
  KEY `gbp_territory_monthly_import_run_idx` (`importRunId`)
);
