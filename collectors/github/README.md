# GitHub Branch Protection Collector

This collector fetches the branch protection rules for a specified branch in a GitHub repository.

## Collected Evidence

This collector retrieves the branch protection rule object from the GitHub API. This object contains detailed information about the protection settings, such as:

*   `required_status_checks`: Settings for required status checks.
*   `enforce_admins`: Whether these rules apply to administrators.
*   `required_pull_request_reviews`: Settings for required pull request reviews.
*   `restrictions`: Who can push to this branch.

If branch protection is not enabled for the specified branch, the `evidence_payload` will contain an object with an `error` key: `{"error": "BranchProtectionNotFound"}`.

## Setup

### Dependencies

This collector requires the `requests` Python library. Before deploying, you must create a Lambda layer containing this dependency. From the root of the repository, run the following commands:

```bash
pip install requests -t collectors/github/python
zip -r collectors/github/layer.zip collectors/github/python
```

### Configuration

1.  **Create a GitHub Personal Access Token (PAT)**:
    *   Go to your GitHub Developer settings.
    *   Create a new PAT with the `repo` scope.
2.  **Store the PAT in AWS Secrets Manager**:
    *   Create a new secret in Secrets Manager.
    *   The secret should be a key-value pair, where the key is `GITHUB_TOKEN` and the value is your PAT.
3.  **Provide Variables to Terraform**:
    *   `github_secret_name`: The name of the secret you created.
    *   `github_secret_arn`: The ARN of the secret you created.
    *   `github_repo`: The repository you want to inspect (e.g., `my-org/my-repo`).
    *   `github_branch`: The branch you want to inspect (e.g., `main`).

## IAM Permissions

This collector's IAM role requires permission to read the specific secret from Secrets Manager that contains the GitHub PAT. This is defined in the `github_collector_policy` and attached to the execution role. The role is also constrained by the `scoutos-CollectorPermissionsBoundary`.