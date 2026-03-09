# Bugfix Requirements Document

## Introduction

The Reports page displays "no sales, expenses, or net profit recorded" with all zeros even when daily entries exist in the system. This occurs because the report generation logic incorrectly attempts to aggregate individual transaction entries (with `type` and `amount` fields) when the actual data structure stores daily summary entries (with `totalSales` and `totalExpense` fields). The mismatch between expected and actual data structure causes the aggregation to produce zero values for all metrics.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the report generation endpoint queries daily entries from DynamoDB THEN the system attempts to aggregate entries by checking `entry.type === 'sale'` and `entry.type === 'expense'`

1.2 WHEN daily entries are stored with fields `totalSales` and `totalExpense` (not `type` and `amount`) THEN the aggregation logic fails to match any entries and produces zero totals

1.3 WHEN the report is generated with zero totals THEN the system displays "no sales, expenses, or net profit recorded" even though valid daily entries exist

### Expected Behavior (Correct)

2.1 WHEN the report generation endpoint queries daily entries from DynamoDB THEN the system SHALL aggregate entries using the correct fields `totalSales` and `totalExpense` from the DailyEntry structure

2.2 WHEN daily entries exist for the requested date THEN the system SHALL correctly sum the `totalSales` and `totalExpense` values to produce accurate report totals

2.3 WHEN the report is generated with valid data THEN the system SHALL display the correct sales, expenses, and net profit values matching the dashboard data

### Unchanged Behavior (Regression Prevention)

3.1 WHEN no daily entries exist for the requested date THEN the system SHALL CONTINUE TO return an appropriate error message indicating no data is available

3.2 WHEN the report generation encounters DynamoDB errors THEN the system SHALL CONTINUE TO handle errors gracefully with proper error responses

3.3 WHEN the report is stored in DynamoDB after generation THEN the system SHALL CONTINUE TO use the correct TTL and data structure for report storage

3.4 WHEN the Bedrock AI generates insights from the aggregated data THEN the system SHALL CONTINUE TO format and store insights correctly
