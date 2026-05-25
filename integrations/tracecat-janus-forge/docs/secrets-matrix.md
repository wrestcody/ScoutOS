# Secrets Matrix

| Tool | Secret Keys | Notes |
|---|---|---|
| Okta | `OKTA_DOMAIN`, `OKTA_API_TOKEN` | API token with read users/groups and lifecycle ops if disabling |
| AWS | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | Prefer IAM role in AWS; use keys only for local dev |
| CrowdStrike | `CROWDSTRIKE_CLIENT_ID`, `CROWDSTRIKE_CLIENT_SECRET` | OAuth2 token for APIs |
| Tenable | `TENEBLE_ACCESS_KEY`, `TENEBLE_SECRET_KEY` | Tenable.io API keys |
| Snyk | `SNYK_API_TOKEN` | REST API token |
| Codacy | `CODACY_API_TOKEN` | API token |
| Jenkins | `JENKINS_BASIC_AUTH_B64` | base64("user:token") |
| Jira | `JIRA_BASE_URL`, `JIRA_BASIC_AUTH_B64` | base64("email:api_token") |
| Bitbucket | `BITBUCKET_BASIC_AUTH_B64` | base64("user:app_password") |
| Sumo Logic | `SUMO_BASE_URL`, `SUMO_ACCESS_ID`, `SUMO_ACCESS_KEY` | Access pair for Search Job API |
| Hyperproof | `HYPERPROOF_BASE_URL`, `HYPERPROOF_API_TOKEN` | API token |

> Store in Tracecat Secrets in production; use `.env` only for local testing.