MCP actions for the Genesys-native GRC Engine

Purpose
Define Model Context Protocol (MCP) actions that mirror the same capabilities exposed in Genesys Cloud (Architect/Data Actions/Data Tables) and AWS micro-connectors, so analysts and developers can drive the GRC engine via your MCP server alongside in-product flows.

Prerequisites
- MCP server: https://github.com/MakingChatbots/genesys-cloud-mcp-server
- Genesys Cloud OAuth client with sufficient scopes to read/write Data Tables and invoke Data Actions.
- External endpoints for AWS micro-connectors (e.g., Lambda Function URLs or API Gateway), or an MCP-side HTTP client to reach them.

Design principles
- Parity with Architect: The MCP tool I/O mirrors the Lambda/Data Action contracts.
- No secrets in MCP payloads: All secrets stay in AWS Secrets Manager; MCP calls connector endpoints only.
- Idempotency: All actions accept an optional `correlationId`.

Common contracts
Request
```json
{ "correlationId": "string", "controlId": "string", "params": { } }
```
Response
```json
{
  "status": "SUCCESS|FAILURE|PARTIAL",
  "evidence": { "count": 0, "items": [] },
  "timingMs": 0,
  "meta": { "provider": "string" },
  "error": { "code": "", "message": "" },
  "correlationId": "string"
}
```

Action catalog (recommended)
1) runControl
- Description: Triggers the scheduler bridge to start a specific control in Architect.
- Backend: POST to API Gateway `SCHEDULER_BRIDGE_URL`.
- Request example:
```json
{ "correlationId": "grc-...", "controlId": "okta-admins-v1", "params": { "oktaOrg": "acme.okta.com" } }
```
- Response: Echo from bridge (202 Accepted or connector-style JSON if synchronous).

2) getControlHistory
- Description: Fetch recent runs for a control from the results Data Table.
- Backend: Genesys Cloud Data Tables API (table: `GRC_RESULTS`).
- Request:
```json
{ "controlId": "okta-admins-v1", "since": "2025-09-01T00:00:00Z" }
```
- Response (shape flexible):
```json
{ "status": "SUCCESS", "evidence": { "count": 2, "items": [{"correlationId": "...", "timestamp": "...", "result": "PASS|FAIL"}] } }
```

3) getGoldenRecord
- Description: Retrieve expected state for a control (Data Table `GRC_GOLDEN_<controlId>`).
- Backend: Genesys Cloud Data Tables API.
- Request:
```json
{ "controlId": "okta-admins-v1" }
```
- Response: Connector-style, with `evidence.items` holding the golden entities.

4) updateGoldenRecord
- Description: Update expected state in the relevant Data Table.
- Backend: Genesys Cloud Data Tables API (PUT row).
- Request:
```json
{ "controlId": "okta-admins-v1", "params": { "approvedItems": ["a@acme.com"] } }
```
- Response: Connector-style success/failure.

5) jira_issue_create
- Description: Create a Jira issue for a deviation.
- Backend: Call the `jira_issue_create` Lambda endpoint.
- Request:
```json
{ "params": { "projectKey": "GRC", "summary": "Okta admins drift", "description": "...", "issueType": "Task" } }
```
- Response: `{ evidence.items[0].issueKey, url }` on success.

6) jira_comment_add
- Description: Add a comment to a Jira issue.
- Backend: Jira API or Lambda wrapper.
- Request:
```json
{ "params": { "issueKey": "GRC-123", "comment": "Investigating." } }
```

7) okta_admins_get
- Description: Fetch Okta admin user emails.
- Backend: `okta_admins_get` Lambda endpoint.
- Request:
```json
{ "params": { "oktaOrg": "acme.okta.com" } }
```

8) aws_s3_encryption_get
- Description: List S3 buckets and encryption status.
- Backend: `aws_s3_encryption_get` Lambda endpoint.
- Request: `{}` (no params required)

9) sumo_search_run (optional)
- Backend: Sumo Logic search API or Lambda wrapper.
```json
{ "params": { "query": "_sourceCategory=grc AND error", "timeRange": "-24h" } }
```

10) nr_alerts_open_get (optional)
- Backend: New Relic Alerts API or Lambda wrapper.
```json
{ "params": { "app": "contact-center" } }
```

11) cs_host_status_get (optional)
- Backend: CrowdStrike API or Lambda wrapper.
```json
{ "params": { "hostname": "cc-agent-01" } }
```

12) workday_worker_get (optional)
- Backend: Workday API or Lambda wrapper.
```json
{ "params": { "email": "user@acme.com" } }
```

Wiring MCP actions in practice
- Analyst Script (Genesys): Buttons should call Genesys Data Actions directly for low-latency workflows (e.g., re-run control, create Jira).
- MCP (Assistant): Provide the same actions for ChatOps-style interactions and developer productivity. The assistant calls MCP tools, which invoke the same Lambda/API endpoints, returning the standardized JSON contracts.

Notes
- Keep MCP responses lightweight and aligned with connector outputs to simplify downstream prompts and UI binding.
- Prefer Lambda wrappers for third-party tools to centralize secrets in AWS.

