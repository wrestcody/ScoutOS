The Janus Forge: Proof of Concept (PoC) To-Do List

Phase 0: Foundational Infrastructure Setup

Genesys Cloud Configuration
- [ ] Create dedicated OAuth Client (client credentials) with scopes for Architect, Data Actions, Data Tables, Authorization, Analytics
- [ ] Configure and activate AWS EventBridge integration (partner source)
- [ ] Configure and activate AWS Lambda Data Actions integration (IAM trust + specific ARNs)
- [ ] Create routing queues: "GRC-Exceptions" and "Compliance Triage" (skills, SLAs)

AWS Configuration
- [ ] Select AWS account/region; initialize Terraform workspaces (dev/test)
- [ ] Create S3 buckets: Evidence (versioning/KMS) and Firehose backup (lifecycle)
- [ ] Create IAM roles/policies: Lambda execution (least privilege), Data Actions invoke, Firehose, evidence PutObject (prefix-only)
- [ ] Create Secrets Manager entries: Okta, Jira, Workday, Genesys OAuth, Sumo, Training

Sumo Logic Pipeline Configuration
- [ ] Create Hosted Collector + HTTP Source; decide _sourceCategory (e.g., genesys-cloud-logs)
- [ ] Provision Firehose delivery to HTTP Source with S3 backup
- [ ] EventBridge rule for aws.partner/genesys.cloud -> Firehose target
- [ ] Validate end-to-end ingestion

Phase 1: PoC Blueprint — Continuous Control Monitoring (The Sentinel)

Objective: Automate the monthly forging of a privileged access roster and compare against approved Ingots.

Ingots & Queues
- [ ] Create an Ingot named `Ingot-ApprovedAdmins` and seed `approvedItems`
- [ ] Confirm "GRC-Exceptions" queue

Forge Tools (Lambdas)
- [ ] ForgeTool-GetOktaAdmins
  - [ ] Query Okta "Administrators" group; return flattened JSON
- [ ] ForgeTool-GetAwsIamAdmins
  - [ ] List IAM users in "Administrators" group; paginate
- [ ] ForgeTool-UploadEvidence
  - [ ] Accept JSON, format CSV, upload to evidence locker; return S3 URI

Data Actions (Genesys)
- [ ] Create Data Actions for ForgeTool-GetOktaAdmins, ForgeTool-GetAwsIamAdmins, ForgeTool-UploadEvidence

Scheduling
- [ ] EventBridge monthly rule (1st @ 02:00 UTC) to trigger the Blueprint

Blueprint-PrivilegedRoster (Architect)
- [ ] Inputs: correlationId
- [ ] Steps: call ForgeTool-GetOktaAdmins; call ForgeTool-GetAwsIamAdmins; compare vs Ingot-ApprovedAdmins; create task on drift; call ForgeTool-UploadEvidence; write to results table

Phase 2: PoC Blueprint — AI-Powered Audit Query (The Augur)

Objective: Fulfill a plain-language audit request by querying Sumo Logic and presenting results via The Hearth.

The Hearth (Agent Script)
- [ ] Design and create The Hearth for the GRC team (input: Audit Request; button: Generate Evidence; results table)

Forge Tools (Lambdas)
- [ ] Create the ForgeTool-QueryTheAugur micro-connector
  - [ ] Bedrock prompt to translate NL -> Sumo query
  - [ ] Sumo Search Job API (create, poll, fetch messages)

Data Actions (Genesys)
- [ ] Create Data Action for ForgeTool-QueryTheAugur

Blueprint-AugurQuery (Architect)
- [ ] Triggered by The Hearth button; call ForgeTool-QueryTheAugur; display results; optional upload evidence

Phase 3: PoC Review and Finalization

- [ ] End-to-end testing for both Blueprints (success/failure)
- [ ] Security checks: IAM least privilege; secrets scope; logs without sensitive data; log retention
- [ ] Documentation: architecture diagrams; runbooks; setup instructions; Janus Forge lexicon adherence
- [ ] CX as Code: package Blueprints, Forge Tools (via Data Actions), Ingots, queues, and The Hearth
- [ ] Demo prep: live script for The Sentinel and The Augur

