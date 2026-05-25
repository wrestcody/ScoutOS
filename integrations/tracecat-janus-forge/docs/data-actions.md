Data Action templates for top playbooks

Overview
Each Data Action wraps a Lambda micro-connector with a simple JSON contract. Below are request/response templates you can adapt in Genesys Cloud.

Conventions
- Request body (raw):
```json
{
  "correlationId": "${input.correlationId}",
  "controlId": "${input.controlId}",
  "params": ${input.params}
}
```
- Success mapping: `status`, `evidence.items`, `timingMs`, `meta`, `error.code`, `error.message`, `correlationId`.

1) vendor_security_score_get
- Input suggestions:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "vendor-security-review", "params": { "domain": "$(Flow.vendorDomain)" } }
```
- Output mapping:
  - `status` -> `Flow.status`
  - `evidence.items[0].score` -> `Flow.vendorScore`
  - `evidence.items[0].grade` -> `Flow.vendorGrade`

2) offboarding_terminated_employees_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "offboarding-verify", "params": { "sinceDays": 1 } }
```
- Output:
  - `evidence.items` -> `Flow.terminatedEmployeesJson` (stringify if needed)

3) check_user_access
- Input (Okta):
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "offboarding-verify", "params": { "provider": "okta", "email": "$(Flow.userEmail)" } }
```
- Output:
  - `evidence.items[0].active` -> `Flow.userActive`

4) ir_evidence_log
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "ir-test", "params": { "record": $(Flow.irRecordJson) } }
```

5) policy_attestation_log
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "policy-attest", "params": { "record": $(Flow.attestRecordJson) } }
```

6) firewall_rules_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "fw-audit", "params": {} }
```
- Output:
  - `evidence.items` -> `Flow.firewallRulesJson`

7) aws_iam_admins_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "privileged-roster", "params": { "groupName": "Administrators" } }
```
- Output:
  - `evidence.items` -> `Flow.awsAdminsJson`

8) aws_security_configs_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "cloud-config-snapshot", "params": {} }
```
- Output:
  - `evidence.items[0].securityGroupsOpen` -> `Flow.openSgJson`
  - `evidence.items[0].publicBuckets` -> `Flow.publicBucketsJson`
  - `evidence.items[0].iamPasswordPolicy` -> `Flow.iamPasswordPolicyJson`

9) jira_change_tickets_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "change-control", "params": { "jql": "project=GRC AND type=\"Production Change\" AND status=Done AND updated >= -7d" } }
```
- Output:
  - `evidence.items` -> `Flow.changeTicketsJson`

10) active_employees_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "training-audit", "params": {} }
```
- Output:
  - `evidence.items` -> `Flow.activeEmployeesJson`

11) training_completions_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "training-audit", "params": { "module": "Annual Security Training 2025" } }
```
- Output:
  - `evidence.items` -> `Flow.trainingCompletionsJson`

12) genesys_cloud_admins_get
- Input:
```json
{ "correlationId": "$(Flow.correlationId)", "controlId": "gc-admin-audit", "params": {} }
```
- Output:
  - `evidence.items` -> `Flow.gcAdminsJson`

