CREATE TABLE `gsc_page_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`pageUrl` text NOT NULL,
	`clicks` int NOT NULL DEFAULT 0,
	`impressions` int NOT NULL DEFAULT 0,
	`ctrBps` int NOT NULL DEFAULT 0,
	`positionHundredths` int NOT NULL DEFAULT 0,
	`sourceProperty` varchar(255) NOT NULL,
	`pathPrefix` varchar(255) NOT NULL,
	CONSTRAINT `gsc_page_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gsc_query_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`query` text NOT NULL,
	`clicks` int NOT NULL DEFAULT 0,
	`impressions` int NOT NULL DEFAULT 0,
	`ctrBps` int NOT NULL DEFAULT 0,
	`positionHundredths` int NOT NULL DEFAULT 0,
	`sourceProperty` varchar(255) NOT NULL,
	`pathPrefix` varchar(255) NOT NULL,
	CONSTRAINT `gsc_query_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salesforce_performance_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`species` varchar(128) NOT NULL DEFAULT '__ALL__',
	`periodStart` varchar(10) NOT NULL,
	`periodEnd` varchar(10) NOT NULL,
	`inspections` int NOT NULL DEFAULT 0,
	`closedJobs` int NOT NULL DEFAULT 0,
	`sourceLabel` varchar(255) NOT NULL DEFAULT 'Salesforce',
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salesforce_performance_snapshots_id` PRIMARY KEY(`id`)
);
