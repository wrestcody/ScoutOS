Compliance playbooks: PCI DSS & SOC 2 workflows

Overview
Five evidence automation workflows designed to run as native-first Architect flows with Lambda micro-connectors and Data Actions. Each includes trigger, connectors, golden-record usage, exception routing, and evidence logging.

1) Automated Deactivation of Inactive Accounts
- Standards: PCI DSS 8.1.4, SOC 2 CC6.3
- Trigger: Weekly (EventBridge) -> Architect "Inactive Account Review" flow
- Micro-connectors:
  - `get-inactive-users-lambda` (IdP: Okta/Azure AD): list users inactive > 90 days for in-scope systems
  - `disable-user-lambda`: disable user in IdP
  - `log-evidence-lambda`: write evidence to SharePoint/Hyperproof (or archive store)
- Flow logic:
  - Fetch list of inactive users
  - For each: disable via connector; log evidence (user, lastLogin, timestamp)
  - On connector error: route task to `GRC-Exceptions` with `Identity` skill
- Golden records: Optional allowlist/exception users in Data Table

2) Quarterly Privileged Access Reviews
- Standards: PCI DSS 7.1.3, SOC 2 CC6.2
- Trigger: Quarterly (EventBridge) -> "Quarterly Access Review" flow
- Micro-connectors:
  - `get-privileged-users-by-manager-lambda` (CDE systems + Workday mapping)
  - `grc-attest-log-lambda` (attestation write to GRC platform)
  - `jira_issue_create` (de-provision ticket on revoke)
- Flow logic:
  - For each manager: create task; Script shows direct reports and entitlements
  - Script actions: Certify -> log attestation; Revoke -> create Jira ticket then log
  - SLA timers and escalation if not completed
- Golden records: Required entitlements per role/team in Data Tables

3) Continuous Cloud Configuration Monitoring
- Standards: SOC 2 CC7.1
- Trigger: Hourly (EventBridge) -> "AWS Config Check" flow
- Micro-connectors:
  - `get-aws-config-lambda`: fetch SG rules open to 0.0.0.0/0, public S3 buckets, wildcard IAM policies
- Flow logic:
  - Compare current config vs Data Table baseline
  - On deviation: create high-priority task to Cloud Security queue with details
  - Optional: auto-remediate low-risk deviations via dedicated connectors
- Golden records: Config baselines per account/service in Data Tables

4) AI-Summarized Privileged Activity Audit
- Standards: PCI DSS 10.2.2, SOC 2 CC7.2
- Trigger: Daily (EventBridge) -> "Privileged Log Review" flow
- Micro-connectors:
  - `get-privileged-logs-lambda` (SIEM: Sumo Logic)
  - `summarize-text-bedrock-lambda` (Amazon Bedrock model)
- Flow logic:
  - Create analyst task; Script shows AI summary and raw logs tab
  - Analyst marks reviewed or escalates; optional Jira ticket on suspicious activity
- Golden records: N/A; thresholds and keywords configurable in Data Tables

5) Automated Security Training Compliance Check
- Standards: SOC 2 CC2.2
- Trigger: Weekly (EventBridge) -> "Training Compliance" flow
- Micro-connectors:
  - `get-active-employees-lambda` (Workday)
  - `get-training-completion-lambda` (LMS)
- Flow logic:
  - Diff employees vs completions; create manager tasks for overdue cases
  - Include link to module; log summary report to GRC platform/archive
- Golden records: Training policy parameters (due days, exemptions) in Data Tables

Security & evidence
- All connectors use Secrets Manager; Architect stores only outcomes, not credentials.
- Evidence logging uses compact rows in Data Tables and full JSON receipts in CloudWatch/S3 or external GRC (Hyperproof/SharePoint).

Additional playbooks (inspired by Vanta/Tines capabilities)

6) Automated Vendor Security Review & Onboarding
- Standards: SOC 2 CC9.2, PCI DSS 12.8
- Trigger: Webhook from Jira/ServiceNow -> "Vendor Security Review" flow
- Micro-connectors:
  - `get-vendor-security-score-lambda` (e.g., SecurityScorecard/Upguard)
  - `create-review-task-lambda` (GRC tool or Jira ticket)
- Flow logic:
  - Fetch security score; tier risk (e.g., < 75 = High)
  - Create and route task by tier (InfoSec vs GRC); Script with Approve/Deny/Questionnaire
  - Log decision and links to review artifact
- Golden records: Risk tier thresholds and required artifacts in Data Tables

7) Continuous Employee Offboarding Verification
- Standards: SOC 2 CC6.3, PCI DSS 8.1.3
- Trigger: Daily -> "Offboarding Verification" flow
- Micro-connectors:
  - `get-terminated-employees-lambda` (Workday)
  - `check-user-access-lambda` (Okta/AWS/SAAS)
- Flow logic:
  - For each terminated employee: check access; if active, create P1 task to IT Security
  - Log failure and remediation evidence automatically
- Golden records: In-scope systems and SLAs in Data Tables

8) Automated Incident Response Tabletop Exercise
- Standards: SOC 2 CC7.3
- Trigger: Quarterly -> "IR Test" flow
- Micro-connectors:
  - `log-ir-evidence-lambda` (SharePoint/Confluence)
- Flow logic:
  - Create parent task with scenario; spawn dependent tasks per role (Declare, Isolate, Comms)
  - Log timestamps on completion; produce evidence timeline
- Golden records: Scenario catalog and role assignments in Data Tables

9) Automated Policy Acknowledgment & Attestation
- Standards: SOC 2 CC1.1, PCI DSS 12.1
- Trigger: New hire or policy update (manual trigger allowed)
- Micro-connectors:
  - `log-attestation-lambda` (GRC evidence store)
- Flow logic:
  - Send email/SMS with policy and unique attestation link
  - Link calls API -> second flow logs attestation; primary flow sends reminders weekly
- Golden records: Policy versions, due-by windows, exemptions in Data Tables

10) Automated Firewall & Security Group Rule Review
- Standards: PCI DSS 1.1.1, SOC 2 CC7.1
- Trigger: Weekly -> "Firewall Rule Audit" flow
- Micro-connectors:
  - `get-firewall-rules-lambda` (AWS/fir ewalls)
- Flow logic:
  - Compare rules vs Approved Ruleset (ports/protocols/source IPs) in Data Table
  - Create task for Network Security on unauthorized/risky rules; Script shows asset/rule/creator
- Golden records: Approved ruleset and ownership mappings in Data Tables

