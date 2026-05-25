Security guide for the Genesys-native GRC Engine (PoC)

Goals
- Protect credentials and control data while enabling automated evidence collection and exception handling.
- Provide least-privilege access for all components and a clear audit trail.

Principles
- Secrets live only in AWS Secrets Manager; never store or pass secrets via Genesys Cloud.
- Least privilege IAM per connector; narrow actions and resources.
- Fail closed: on transport or auth errors, return a FAILURE status in JSON; Architect handles exceptions.
- Structured logging with no sensitive values; use correlationId for traceability.
- Encryption everywhere (KMS at-rest, TLS in-transit); rotate secrets routinely.

Secrets
- Okta: store `{ "token": "<okta_api_token>" }` in Secrets Manager.
- Jira: store either `{ "email": "user@org.com", "apiToken": "..." }` or `{ "bearer": "..." }`.
- Access via IAM policy `secretsmanager:GetSecretValue` scoped to specific secret ARNs.

IAM
- Lambda roles:
  - `lambda_with_secrets_role`: basic logs + Secrets Manager read for exact ARNs.
  - `lambda_s3_role`: basic logs + S3 `ListAllMyBuckets` and `GetBucketEncryption`.
- Consider permission boundaries or SCPs in org accounts.

Networking
- Use VPC endpoints for APIs that require private connectivity; otherwise keep Lambdas public egress minimal with egress-only NAT.
- Restrict outbound to required domains if using egress firewall.

Data handling
- Golden records stored in Genesys Data Tables; do not include secrets or PII beyond work emails.
- Evidence responses should be flattened; avoid dumping raw tokens or headers.

Logging & monitoring
- CloudWatch retention set via Terraform; redact tokens and personally sensitive data.
- Emit high-level metrics: success/failure counts, latency; avoid per-user PII in logs.

Genesys Cloud
- Data Actions invoke Lambda ARNs through IAM; do not embed credentials in request templates.
- Architect flows handle error statuses and route to exception processes.

Compliance
- Map controls to SOC2/ISO families where relevant (e.g., Access Control, Change Management).
- Maintain run history in a Data Table; archive full JSON to CloudWatch/S3 for audit.

