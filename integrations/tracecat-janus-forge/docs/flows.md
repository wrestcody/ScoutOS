Architect flow stubs for top playbooks

General pattern
- Input variables: `correlationId`, `controlId`, domain-specific params
- Steps: Load golden record (if applicable) -> Call Data Action(s) -> Evaluate -> Log -> Pass/Fail/Task

1) Privileged Access Roster Generation (monthly)
- Inputs: `correlationId`
- Steps:
  1. Call `get-okta-admins` (Data Action -> Lambda `okta_admins_get`)
  2. Call `get-aws-iam-admins` (Data Action -> Lambda `aws_iam_admins_get`)
  3. Optional: Call `get-database-dba-users` (placeholder)
  4. Build rows array (combine lists) and call `format-and-upload-evidence` to produce CSV in S3
  5. Write compact result to Data Table and end

2) Cloud Security Configuration Snapshot (weekly)
- Inputs: `correlationId`
- Steps:
  1. Call `aws_security_configs_get`
  2. Call evidence logger (optional) to archive JSON snapshot
  3. Write summary row to Data Table with counts of findings

3) Change Management Process Validation (weekly)
- Inputs: `correlationId`
- Steps:
  1. Call `jira_change_tickets_get` with default JQL
  2. For each ticket: check linked security review field (via Data Action or inline evaluation)
  3. Split into compliant vs exception arrays
  4. Log compliant list; for each exception create task to `GRC-Exceptions`

4) Security Awareness Training Completion Audit (monthly)
- Inputs: `correlationId`
- Steps:
  1. Call `active_employees_get`
  2. Call `training_completions_get` (module configurable)
  3. Compute diff (non-compliant employees)
  4. Upload report via `format-and-upload-evidence`; create HR follow-up task for non-compliant

5) Genesys Cloud Administrative Role Report (weekly)
- Inputs: `correlationId`
- Steps:
  1. Call `genesys_cloud_admins_get`
  2. Upload report via `format-and-upload-evidence`
  3. Write summary to Data Table

Notes
- In Architect, use Loop and Decision actions to partition compliant vs exceptions.
- Keep all thresholds and lists in Data Tables so analysts can edit without code changes.

