AI GRC Analyst Guide (PoC) using AI Studio

Objective
Build an internal virtual agent in AI Studio that guides GRC analysts through deviation investigations and routine evidence tasks, leveraging existing Data Actions and micro-connectors.

Key ideas
- Use AI Studio "Guides" to design a stepwise, conversational flow with tool calls.
- Bind Guide actions to Genesys Data Actions that call our Lambdas (Okta admins, S3 encryption, Jira, etc.).
- Contextual memory via conversation attributes (controlId, correlationId, entity).

User journey (example)
1) Bot: "I see you're reviewing a control failure for 'MFA Enabled for Admins.' Would you like me to fetch the list of non-compliant users?"
   - Action: Calls Data Action `okta_admins_get`, compares vs golden record in a follow-up step.
2) Analyst: "Yes."
   - Bot: "The non-compliant user is 'example@user.com'. Shall I create a Jira ticket to track remediation?"
   - Action: Calls `jira_issue_create` with summary/description.
3) Analyst: "Create the ticket."
   - Bot: "Ticket GRC-123 created. Do you want me to suppress this deviation for 7 days?"
   - Action: Updates Data Table row for suppression window.
4) Analyst: "Also re-run the check."
   - Bot: Triggers `runControl` via Scheduler Bridge (or invokes the Lambda directly), returns status.

Guide design
- Intents: "fetch_evidence", "create_ticket", "suppress", "rerun_control", "show_history".
- Tools: Data Actions for `okta_admins_get`, `aws_s3_encryption_get`, `jira_issue_create`, `generate_vendor_roster`, `summarize_privileged_activity`.
- Entities: controlId, userEmail, bucket, projectKey.
- Memory: correlationId propagated across steps.

Security & governance
- No secrets in prompts; all sensitive actions via Data Actions.
- Role-based access for Guide usage; restrict to GRC and Security teams.

MVP milestones
- Build Guide with two paths: (a) MFA deviation handling, (b) Cloud config drift triage.
- Add cards with evidence summaries and quick actions (Ticket, Suppress, Re-run).
- Telemetry: success/fail of actions, average handle time for deviations.

