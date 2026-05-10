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
from securesystemslib.signer import CryptoSigner
from securesystemslib.dsse import Envelope

def sign_evidence(payload: dict) -> dict:
    """Signs the JSON payload using DSSE and a local PEM key."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    key_path = os.path.join(base_dir, "test_key.pem")

    if not os.path.exists(key_path):
        logger.warning("No test_key.pem found. Generating a temporary one for testing.")
        # Fallback for testing if key generation script wasn't run
        import subprocess
        subprocess.run(["python", os.path.join(base_dir, "gen_key.py")], check=True)

    with open(key_path, 'rb') as f:
        pem_bytes = f.read()

    # Standard Witness/in-toto payload type
    payload_type = "application/vnd.in-toto+json"

    # Create signer
    signer = CryptoSigner.from_pem(pem_bytes)

    # Create and sign envelope
    payload_bytes = json.dumps(payload).encode('utf-8')
    envelope = Envelope.sign(signer, payload_bytes, payload_type)

    return envelope.to_dict()


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
        # Check=False so we can inspect the exit code ourselves
        result = subprocess.run(cmd, capture_output=True, text=True)

        # For the human output format, if rex-runner encounters an error (e.g. PermissionDenied),
        # it prints the error to stderr and exists with code 1. Or, if it's returning the JSON structure
        # it might have a "status":"ERROR" inside stdout.

        # If rex-runner fails out with exit code != 0, it means the script failed to run
        # or threw a hard error (like a permission denied).
        # Sometimes rex-runner writes to stderr, sometimes to stdout.
        if result.returncode != 0:
            error_msg = result.stderr if result.stderr else result.stdout
            logger.error(f"Rex Execution Failed: {error_msg}")
            raise RuntimeError(f"Rex policy execution denied or failed: {error_msg}")

        # Even with returncode 0, if 'PermissionDenied' is in the output (some formats), catch it
        if "PermissionDenied" in result.stdout or "PermissionDenied" in result.stderr:
             raise RuntimeError(f"Rex policy execution denied or failed: {result.stdout} {result.stderr}")

        try:
            parsed = json.loads(result.stdout.strip())
            # Sometimes rex-runner returns a wrapper object on error even if returncode is 0 depending on format
            if isinstance(parsed, dict) and parsed.get("status") == "ERROR":
                raise RuntimeError(f"Rex policy execution denied or failed: {json.dumps(parsed)}")
            return parsed
        except json.JSONDecodeError as e:
            # Maybe the output wasn't json, though our rhai scripts use to_json()
            # If the script failed and printed plain text:
            raise RuntimeError(f"Invalid Rex output format. Raw output: {result.stdout.strip()}")

    except Exception as e:
        raise RuntimeError(f"Rex execution error: {str(e)}")

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
        signed_envelope = sign_evidence(evidence)
        s3_client = boto3.client('s3')
        s3_client.put_object(
            Bucket=evidence_bucket,
            Key=file_name,
            Body=json.dumps(signed_envelope, indent=2),
            ContentType='application/json'
        )
        return f"Successfully wrote signed evidence to s3://{evidence_bucket}/{file_name}"
    except Exception as e:
        logger.error(f"Failed to write to S3 bucket {evidence_bucket}: {e}")
        signed_envelope = sign_evidence(evidence)
        return f"Would have written to S3, but failed: {e}\nSigned Envelope: {json.dumps(signed_envelope)}"

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

    signed_envelope = sign_evidence(evidence)

    return f"Collected GitHub branch protection data via Rex for {repository}:\n{json.dumps(signed_envelope)}"

if __name__ == "__main__":
    mcp.run(transport='stdio')
