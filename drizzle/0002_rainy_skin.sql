CREATE TABLE `suburb_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`territoryId` varchar(64) NOT NULL,
	`suburbName` varchar(128) NOT NULL,
	`suburbSlug` varchar(128) NOT NULL,
	`status` enum('draft','in_review','approved','exported') NOT NULL DEFAULT 'draft',
	`contentJson` text,
	`schemaJson` text,
	`metaTitle` varchar(256),
	`metaDescription` text,
	`h1` varchar(256),
	`wordCount` int,
	`speciesTiers` text,
	`reviewedBy` varchar(128),
	`reviewerNotes` text,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	CONSTRAINT `suburb_pages_id` PRIMARY KEY(`id`)
);
