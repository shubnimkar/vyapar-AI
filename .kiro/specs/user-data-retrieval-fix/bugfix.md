# Bugfix Requirements Document: User Data Retrieval Fix

## Introduction

The report generation endpoint (`/api/reports/generate`) and DynamoDB sync operations are failing to retrieve user data from DynamoDB, resulting in "No data for user" warnings even when the userId is valid. This prevents users from generating reports and causes sync failures. The issue stems from incorrect DynamoDB query construction where the partition key (PK) format doesn't match the actual data structure in the table.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the report generation endpoint queries DynamoDB using `queryByPK('USER#{userId}', 'ENTRY#')` THEN the system returns zero entries even though valid entries exist in the table

1.2 WHEN the system constructs the partition key as `USER#{userId}` for querying daily entries THEN the query fails to match the actual PK format used when storing entries

1.3 WHEN sync operations attempt to retrieve user data from DynamoDB THEN the system logs "No data for user" warnings and returns empty result sets

1.4 WHEN entries are stored in DynamoDB using `DailyEntryService.saveEntry()` THEN the PK is generated using `generatePK('USER', userId)` which creates the format `USER#{userId}`

1.5 WHEN entries are queried using `queryByPK()` in the report generation endpoint THEN the query uses the same `USER#{userId}` format but still returns no results

### Expected Behavior (Correct)

2.1 WHEN the report generation endpoint queries DynamoDB for daily entries THEN the system SHALL successfully retrieve all entries matching the user's partition key

2.2 WHEN the system constructs partition keys for queries THEN the format SHALL exactly match the format used when storing data

2.3 WHEN sync operations query DynamoDB THEN the system SHALL return all relevant user data without "No data for user" warnings

2.4 WHEN querying for entries with a valid userId THEN the system SHALL return at least the entries that were previously stored for that user

2.5 WHEN the query returns zero results for a known valid user THEN the system SHALL log diagnostic information about the query parameters and table state

### Unchanged Behavior (Regression Prevention)

3.1 WHEN storing new daily entries to DynamoDB THEN the system SHALL CONTINUE TO use the `DailyEntryService.saveEntry()` method with the same PK/SK format

3.2 WHEN storing new credit entries to DynamoDB THEN the system SHALL CONTINUE TO use the `CreditEntryService.saveEntry()` method with the same PK/SK format

3.3 WHEN querying entries for users with existing data THEN the system SHALL CONTINUE TO return all previously stored entries

3.4 WHEN the DynamoDB client handles credential errors THEN the system SHALL CONTINUE TO gracefully degrade and log warnings instead of throwing errors

3.5 WHEN profile data is queried or stored THEN the system SHALL CONTINUE TO use the `PROFILE#{userId}` partition key format

3.6 WHEN authentication operations query user data THEN the system SHALL CONTINUE TO use the `USER#{username.toLowerCase()}` partition key format
