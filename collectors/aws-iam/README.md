# AWS IAM Password Policy Collector

This collector fetches the IAM password policy for the target AWS account.

## Collected Evidence

This collector retrieves the account's password policy object, which includes settings like minimum password length, required character types, and password reuse prevention.

If no password policy is set for the account, the `evidence_payload` will contain an object with an `error` key: `{"error": "NoPasswordPolicyFound"}`.

## IAM Permissions

This collector requires the following IAM permissions:

*   `iam:GetAccountPasswordPolicy`

This permission is included in the `iam_collector_policy` IAM policy, which is attached to the collector's execution role. The role is also constrained by the `scoutos-CollectorPermissionsBoundary`.