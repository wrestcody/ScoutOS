# scoutos: The Extensible Evidence Collection Framework

`scoutos` is an automated, secure, and extensible framework for collecting compliance and security evidence from various cloud and SaaS platforms.

## Core Concepts

*   **Collectors**: Python scripts that connect to an API, fetch data, and format it into a standardized evidence object.
*   **Evidence Data Lake**: An immutable S3 bucket where all collected evidence is stored securely.
*   **Collector Workbench**: A future developer tool to accelerate the creation of new collectors.

## Evidence Schema

All evidence collected by `scoutos` conforms to a standardized JSON schema, located at `schema/evidence.schema.json`. This ensures that all data in the evidence lake is consistent and queryable.

### Schema Fields

| Field                  | Type           | Description                                                                    |
| ---------------------- | -------------- | ------------------------------------------------------------------------------ |
| `evidence_id`          | string (uuid)  | A unique identifier for this piece of evidence.                                  |
| `collector_name`       | string         | The name of the collector that gathered this evidence.                           |
| `collection_timestamp` | string (date-time) | The ISO 8601 timestamp of when the evidence was collected.                       |
| `target_account_id`    | string         | The ID of the account or environment the evidence was collected from.          |
| `evidence_payload`     | object/array   | The actual evidence data, which can be any valid JSON object or array.         |
| `schema_version`       | string         | The version of the evidence schema used.                                       |

### Example Evidence Object

```json
{
  "evidence_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "collector_name": "aws-iam-password-policy",
  "collection_timestamp": "2025-10-13T19:18:00Z",
  "target_account_id": "123456789012",
  "evidence_payload": {
    "MinimumPasswordLength": 8,
    "RequireSymbols": true,
    "RequireNumbers": true,
    "RequireUppercaseCharacters": true,
    "RequireLowercaseCharacters": true,
    "PasswordReusePrevention": 24,
    "MaxPasswordAge": 90
  },
  "schema_version": "1.0.0"
}
```

## Terraform Modules

This repository contains the Terraform code to deploy the entire `scoutos` engine.

*   `modules/s3-evidence-bucket`: Creates the secure, immutable S3 bucket for evidence storage.
*   `modules/vpc`: Creates the dedicated VPC for running collectors.
*   `modules/iam-permissions-boundary`: Defines the IAM permissions boundary for all collectors.
*   `security-services.tf`: Configures account-level security services like GuardDuty and Macie.