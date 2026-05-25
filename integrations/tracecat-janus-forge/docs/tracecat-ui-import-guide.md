# Tracecat UI Import Guide (Blueprints, Forge Tools, Ingots)

This guide walks through importing The Janus Forge assets into a running Tracecat instance.

## Prerequisites
- Tracecat running locally (`docker compose up -d`) or in your environment
- Credentials configured in Tracecat Secrets per `docs/secrets-matrix.md`

## 1) Import Workflows (Blueprints)
1. Open Tracecat → Workflows.
2. Click “Import from file”.
3. Select `workflows/Blueprint-AugurQuery.yaml` and `workflows/Blueprint-PrivilegedRoster.yaml`.
4. Review steps and save each workflow.

![Workflows List](../images/tracecat-workflows-list.png)
![Import Workflow](../images/tracecat-import-workflow.png)

## 2) Import Action Templates (Forge Tools)
1. Navigate to Integrations → Actions.
2. Click “Import from file(s)”.
3. Select YAML files in `actions/tools/janus/**` you plan to use (Okta, AWS, CrowdStrike, Tenable, Snyk, Codacy, Jira, Bitbucket, Sumo).
4. Save and verify inputs/outputs.

![Actions List](../images/tracecat-actions-list.png)
![Import Actions](../images/tracecat-import-actions.png)

## 3) Register UDFs (Python)
1. Ensure the integrations container is running (local or ECS) so Tracecat can load UDFs.
2. Verify UDFs (e.g., `tools.janus.sumologic.create_and_poll_search_job`, `tools.janus.hyperproof.upload_evidence`) are visible under Integrations → Custom.

![Custom UDFs](../images/tracecat-custom-udfs.png)

## 4) Create Lookup Tables (Ingots)
1. Go to Data → Lookups.
2. Create from YAML: `lookups/Ingot-ApprovedAdminCount.yaml` (and others as needed).
3. Seed rows per blueprint requirements.

![Lookups](../images/tracecat-lookups.png)

## 5) Configure Secrets
1. Settings → Secrets.
2. Add provider secrets for Okta, AWS, Sumo, Jira, Bitbucket, CrowdStrike, Tenable, Snyk, Codacy, Hyperproof.

![Secrets](../images/tracecat-secrets.png)

## 6) Enable Triggers
- Webhooks: Copy the URL for `Blueprint-AugurQuery` and test with curl/Postman.
- Schedules: Enable the monthly schedule on `Blueprint-PrivilegedRoster`.

![Workflow Trigger](../images/tracecat-workflow-trigger.png)

## 7) Validate Runs
- Run each workflow with test inputs (use demo payloads if available).
- Check run logs; confirm Sumo log_event and case creation where applicable.

![Run Details](../images/tracecat-run-details.png)

## Notes
- Replace the image placeholders under `images/` after capturing screenshots from your environment.
- Keep sensitive data out of screenshots (mask org names, tokens, and user PII).