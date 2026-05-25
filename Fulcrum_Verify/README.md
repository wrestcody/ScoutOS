# Fulcrum Verify
An automated GRC and compliance engine to bridge the gap between policy-as-code and automated, evidence-based remediation.

## Core Concept
Fulcrum Verify automates the compliance lifecycle using a simple, powerful workflow: **Audit -> Compare -> Ticket -> Attest**.

It audits live service configurations, compares them against "golden record" policies stored in a Git repo, automatically creates actionable tickets when a failure is detected, and cryptographically signs the entire audit run to produce a tamper-proof, verifiable attestation.

### Architecture
```
[ UI ] -> [ Fulcrum Auditor ] -> [ Mock Services (Git, AWS Config, Jira) ] -> [ Fulcrum Attestor ]
```

## Demo (The "Money Shot")
The entire value proposition can be demonstrated in just a few seconds:

1.  **Click the "Run Audit" button** in the web UI.
2.  The UI **instantly updates** with a sleek dashboard.
3.  The dashboard highlights **actionable triage cards** for failed checks, showing which teams need to act and why.
4.  Each card contains a direct link to the **remediation ticket** (e.g., **TASK-1237**) that was just created, complete with step-by-step instructions on how to fix the issue.
5.  Finally, the UI displays a **verifiable attestation (JWT)** for the entire run, providing tamper-proof evidence that the audit is legitimate.

## Key Features
-   **Pluggable Architecture**: New compliance checks can be easily added as Python files in the `/checks` directory.
-   **Metadata-Driven Policies**: Policies are stored as "golden records" in a mock Git service, enriched with metadata like severity and remediation steps.
-   **Automated, Actionable Ticketing**: Automatically creates tickets with severity, labels, and how-to-fix instructions.
-   **Verifiable Attestations**: Every audit run is cryptographically signed (JWT) by a dedicated microservice to provide tamper-proof evidence of the results.

## How to Run (Local Dev)
1.  **Start the application**:
    ```bash
    docker compose up --build
    ```
2.  **Open the UI**: Navigate to `http://localhost:8080` in your web browser.

## How to Test
### Run Unit Tests
The unit tests for the core check logic can be run directly inside the `fulcrum-auditor` container.
```bash
docker compose exec fulcrum-auditor pytest
```

### Run End-to-End Test
The E2E test validates the entire running application stack from the user's perspective.
```bash
pip install httpx && python run_e2e_test.py
```

## Future Roadmap
-   Swap mock services for real-world APIs (e.g., Jira, GitHub, AWS).
-   Add more compliance checks (e.g., S3 bucket encryption, IAM policy validation).
-   Develop a more sophisticated check-loading and reporting mechanism.
