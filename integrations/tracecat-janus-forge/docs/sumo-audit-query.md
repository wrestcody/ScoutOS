AI-Powered Auditor Request as a Service (Sumo Logic)

Overview
This playbook lets analysts enter a plain-English audit request. A Lambda uses Amazon Bedrock to translate it into a Sumo Logic query, executes a Search Job, and returns results to Architect and the Analyst Script, while archiving evidence.

Components
- Data pipeline (foundation): EventBridge -> Firehose -> Sumo HTTP Source for continuous logs.
- Lambda: `sumo_evidence_get` (Bedrock translate + Sumo Search Job API).
- Data Action: `sumo_evidence_get` to invoke Lambda from Architect.
- Evidence upload: reuse `format_and_upload_evidence` or an external sink (SharePoint/Hyperproof) via webhook.

Usage (Architect)
- Inputs: `correlationId`, `naturalLanguageRequest`, optional `lookbackDays`, `sourceCategory`.
- Steps: Call `sumo_evidence_get` -> show results in Script -> call `format_and_upload_evidence` to archive CSV.

Security
- Sumo API credentials in Secrets Manager (accessId/accessKey).
- Bedrock uses IAM of Lambda; restrict model and region.
- No secrets in Data Actions or logs; retain only queries and redacted results.

Example Script prompt
- "Audit Request": free-text input.
- Button: "Generate Evidence" -> triggers Architect flow -> returns results grid and provides a download link.

