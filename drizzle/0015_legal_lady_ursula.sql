CREATE TABLE `ga4_property_metadata` (
	`propertyId` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL,
	`deletedAt` timestamp,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ga4_property_metadata_propertyId` PRIMARY KEY(`propertyId`)
);
