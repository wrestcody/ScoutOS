Steering documentation: development standards and AI-assisted coding

Purpose
Provide clear standards for building and maintaining The Janus Forge as a Tracecat-native GRC engine so contributors and AI assistants produce consistent, secure, and testable code.

Architecture tenets (Tracecat-first)
- Orchestration: All decision logic is implemented as Tracecat workflows (Blueprints) in YAML.
- Integrations: Forge Tools under the `tools.janus.*` namespace — YAML action templates and Python UDFs using `tracecat_registry`.
- Ingots: Baselines/exceptions live in Tracecat Lookup Tables; never hard-code expected state in code.
- The Hearth: Tracecat Case Management is the analyst workspace for exceptions, tasks, and approvals.

Naming conventions
- Forge Tools (integrations): `tools.janus.<system>.<action>` (e.g., `tools.janus.okta.get_group_members`).
- Blueprints (workflows): `Blueprint-<Outcome>` (e.g., `Blueprint-PrivilegedRoster`, `Blueprint-AugurQuery`).
- Ingots (lookups): `Ingot-<Name>` (e.g., `Ingot-ApprovedAdminCount`).

Contracts and I/O
- UDFs: Register via `@registry.register` with `RegistrySecret` definitions; explicit inputs/outputs; return JSON-serializable dicts.
- Action templates: Use `core.http_request`, `core.transform.*`, `core.control.*` consistently; validate inputs; define clean `output` schema.
- Standard envelopes for telemetry events to Sumo via `tools.janus.sumologic.log_event`.

Security requirements
- Secrets: Use Tracecat Secrets in production; for AWS hosting, map to SSM/Secrets Manager. `.env` is for local-only.
- Least privilege IAM for AWS UDFs (e.g., `iam:List*`, `auditmanager:List*`, `tag:GetResources`) as needed by each tool.
- No secrets/PII in logs; redact sensitive fields. Prefer structured JSON logs.

Observability
- Emit run summaries to Sumo with blueprint name, correlationId, status, counts, and timings.
- Use CloudWatch (on ECS) for container logs; keep retention reasonable.

Coding standards
- Language & runtime: Python 3.11; prefer `httpx` for HTTP; `boto3` for AWS.
- Project packaging: `pyproject.toml`; dependency versions pinned with reasonable ranges.
- Code style: Descriptive variable names; guard clauses; minimal nesting; avoid catching without handling.
- UDF structure: Input validation, timeouts, retries/backoff where appropriate, clear error messages.

Testing & CI
- Unit tests for UDFs (happy-path + error conditions); mock HTTP and AWS clients.
- CI: ruff check + ruff format (–check) and pytest required to pass on PRs.
- No flaky sleeps in tests; use deterministic mocks.

Repository hygiene
- Keep integrations under `actions/tools/janus/**` and workflows under `workflows/**`.
- Lookup seeds under `lookups/**`.
- Infrastructure examples under `infra/**` (ECS task def, Terraform, etc.).
- Docs under `docs/**`; images under `images/**` (no sensitive data in screenshots).

Cursor AI contribution rules
- Always prefer editing existing files with minimal diffs; preserve indentation and formatting.
- Follow naming conventions strictly (`tools.janus.*`, `Blueprint-*`, `Ingot-*`).
- Before code changes: check for existing patterns and reuse utilities; do not duplicate.
- Add tests for new UDFs; update CI if adding dependencies.
- Do not commit secrets; reference `docs/secrets-matrix.md` and use env/secret placeholders.
- For new tools:
  - YAML action templates: define `inputs`, call `core.http_request` with headers from `SECRETS`, produce clean `output`.
  - Python UDFs: use `@registry.register`, `RegistrySecret`, timeouts, error handling, and return dicts only.
- Documentation updates:
  - Update `README.md` when adding top-level commands or flows.
  - Update `docs/hosting-aws-ecs.md` if deployment steps change.
  - Add/modify `docs/tracecat-ui-import-guide.md` if import steps change.

Performance & reliability
- Prefer pagination-aware fetches; avoid unbounded responses.
- Use polling with timeouts for async APIs (as in Sumo Search Job UDF).
- Idempotency and correlation IDs where actions may be retried.

Review & delivery
- All changes via PR; include a brief summary and testing notes.
- Keep changes scoped; separate functional changes from refactors.
- Ensure CI passes and lints are clean before requesting review.

