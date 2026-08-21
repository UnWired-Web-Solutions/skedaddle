CREATE TABLE `report_drafts` (
	`id` varchar(64) NOT NULL,
	`reportType` enum('strategy','proposal') NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`status` enum('draft','in_review','approved','exported','rejected') NOT NULL DEFAULT 'draft',
	`reportStart` varchar(10) NOT NULL,
	`reportEnd` varchar(10) NOT NULL,
	`configJson` json NOT NULL,
	`dataSnapshotJson` json NOT NULL,
	`sectionsJson` json,
	`html` longtext NOT NULL,
	`createdByUserId` int NOT NULL,
	`exportedByUserId` int,
	`pdfUrl` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`exportedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `report_drafts_territory_type_status_idx` ON `report_drafts` (`territoryId`,`reportType`,`status`,`generatedAt`);
