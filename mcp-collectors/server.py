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

import subprocess

def run_rex_script(script_name: str) -> dict:
    """Helper to execute a Rex script and return the JSON output."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    script_path = os.path.join(base_dir, "rex_policies", f"{script_name}.rhai")
    policy_path = os.path.join(base_dir, "rex_policies", f"{script_name}.cedar")

    # Ensure rex-runner is accessible
    rex_bin = os.path.expanduser("~/.cargo/bin/rex-runner")
    if not os.path.exists(rex_bin):
        # Fallback to system path if global
        rex_bin = "rex-runner"

    cmd = [
        rex_bin,
        "--script-file", script_path,
        "--policy-file", policy_path,
        "--output-format", "human"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout.strip())
    except subprocess.CalledProcessError as e:
        logger.error(f"Rex Execution Failed: {e.stderr}")
        raise RuntimeError(f"Rex policy execution denied or failed: {e.stderr}")
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Rex output: {result.stdout}")
        raise RuntimeError(f"Invalid Rex output format: {e}")

@mcp.tool()
def collect_aws_iam_password_policy(evidence_bucket: str, target_account_id: str) -> str:
    """
    Collects the AWS IAM password policy securely via Trusted Remote Execution (Rex) and writes it to S3.
    Mapped from legacy AWS IAM collector.

    Args:
        evidence_bucket: The S3 bucket to write evidence to
        target_account_id: The target AWS account ID
    """
    logger.info("Starting AWS IAM Password Policy collection via Rex...")

    try:
        collected_data = run_rex_script("aws_iam")
    except Exception as e:
        return f"Error executing secure collection script: {e}"

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
    Collects GitHub branch protection rules securely via Trusted Remote Execution (Rex).
    Mapped from legacy GitHub collector.

    Args:
        evidence_bucket: The S3 bucket to write evidence to
        repository: The GitHub repository to check (e.g., 'owner/repo')
    """
    try:
        collected_data = run_rex_script("github")
    except Exception as e:
        return f"Error executing secure collection script: {e}"

    evidence = {
        "evidence_id": str(uuid.uuid4()),
        "collector_name": "github-branch-protection",
        "collection_timestamp": datetime.now(timezone.utc).isoformat(),
        "target_repo": repository,
        "evidence_payload": collected_data,
        "schema_version": "1.0.0"
    }

    return f"Collected GitHub branch protection data via Rex for {repository}: {json.dumps(evidence)}"

if __name__ == "__main__":
    mcp.run(transport='stdio')
