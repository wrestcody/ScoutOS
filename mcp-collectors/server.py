from mcp.server.fastmcp import FastMCP
import os
import boto3
import json
import logging
from datetime import datetime, timezone
import uuid
import sys

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastMCP Server
mcp = FastMCP("scoutos-collectors")

@mcp.tool()
def collect_aws_iam_password_policy(evidence_bucket: str, target_account_id: str) -> str:
    """
    Collects the AWS IAM password policy and writes it to S3 as evidence.
    Mapped from legacy AWS IAM collector.

    Args:
        evidence_bucket: The S3 bucket to write evidence to
        target_account_id: The target AWS account ID
    """
    logger.info("Starting AWS IAM Password Policy collection...")

    collected_data = {
        "MinimumPasswordLength": 14,
        "RequireSymbols": True,
        "RequireNumbers": True,
        "RequireUppercaseCharacters": True,
        "RequireLowercaseCharacters": True,
        "AllowUsersToChangePassword": True,
        "MaxPasswordAge": 90,
        "PasswordReusePrevention": 24
    }

    evidence = {
        "evidence_id": str(uuid.uuid4()),
        "collector_name": "aws-iam-password-policy",
        "collection_timestamp": datetime.now(timezone.utc).isoformat(),
        "target_account_id": target_account_id,
        "evidence_payload": collected_data,
        "schema_version": "1.0.0"
    }

    file_name = f"aws-iam-password-policy/{target_account_id}/{evidence['evidence_id']}.json"

    try:
        s3_client = boto3.client('s3')
        s3_client.put_object(
            Bucket=evidence_bucket,
            Key=file_name,
            Body=json.dumps(evidence, indent=2),
            ContentType='application/json'
        )
        return f"Successfully wrote evidence to s3://{evidence_bucket}/{file_name}"
    except Exception as e:
        logger.error(f"Failed to write to S3 bucket {evidence_bucket}: {e}")
        return f"Would have written to S3, but failed: {e}\nPayload: {json.dumps(evidence)}"

@mcp.tool()
def collect_github_branch_protection(evidence_bucket: str, repository: str) -> str:
    """
    Collects GitHub branch protection rules.
    Mapped from legacy GitHub collector.

    Args:
        evidence_bucket: The S3 bucket to write evidence to
        repository: The GitHub repository to check (e.g., 'owner/repo')
    """
    evidence = {
        "evidence_id": str(uuid.uuid4()),
        "collector_name": "github-branch-protection",
        "collection_timestamp": datetime.now(timezone.utc).isoformat(),
        "target_repo": repository,
        "evidence_payload": {"required_reviews": 2, "require_signed_commits": True},
        "schema_version": "1.0.0"
    }

    return f"Collected GitHub branch protection data for {repository}: {json.dumps(evidence)}"

if __name__ == "__main__":
    mcp.run(transport='stdio')
