The Janus Forge: Proof of Concept (PoC) To-Do List (Tracecat Implementation)

Phase 0: Infrastructure & Foundations
- Deploy Tracecat instance on AWS Fargate (PostgreSQL + object storage configured)
- Configure Git-based integrations repository sync (this repo)
- Set up CI: pre-commit with ruff; build/publish package
- Populate Tracecat secrets manager (Okta, Sumo Logic, Jira, AWS creds)

Phase 1: Forge Tools (Integrations)
- Implement Python UDF tools.janus.sumologic.create_and_poll_search_job
- Create YAML template tools.janus.okta.get_group_members
- Stubs for tools.janus.jira.issue_create and tools.janus.aws.s3_encryption_get

Phase 2: Ingots (Lookup Tables)
- Create Ingot-ApprovedAdminCount lookup table with baseline
- Add Ingot-ApprovedAdmins (optional) for explicit roster baselines

Phase 3: Blueprints (Workflows)
- Build Blueprint-AugurQuery webhook workflow (AI query -> Sumo UDF -> results)
- Build Blueprint-PrivilegedRoster scheduled workflow (monthly)
- Add case creation in The Hearth when roster changes

Phase 4: Testing & Hardening
- Unit test UDF with mocked Sumo endpoints
- Integration test Okta template against sandbox
- Linting/type checks; secrets and error handling review

Phase 5: Demo Readiness
- Populate demo-friendly data and saved requests
- Create analyst runbook and screenshots from The Hearth
- Final dry-run of Augur and Privileged Roster flows

