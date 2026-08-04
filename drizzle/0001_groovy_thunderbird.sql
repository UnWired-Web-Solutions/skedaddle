CREATE TABLE `salesforce_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(128) NOT NULL DEFAULT 'Skedaddle Salesforce',
	`instanceUrl` text NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`sfUserId` varchar(64),
	`sfOrgId` varchar(64),
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `salesforce_connections_id` PRIMARY KEY(`id`)
);
