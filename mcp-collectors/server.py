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
        # Check=False so we can inspect the exit code ourselves
        result = subprocess.run(cmd, capture_output=True, text=True)

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
def transcribe_audio(file_path: str) -> str:
    """
    Transcribes a local audio file using Whisper.

    Args:
        file_path: The absolute path to the audio file to transcribe.
    """
    logger.info(f"Starting Whisper transcription for {file_path}")
    if not os.path.exists(file_path):
        return f"Error: Audio file not found at {file_path}"

    try:
        import whisper
        # Using tiny.en for fast local CPU execution
        model = whisper.load_model("tiny.en")
        result = model.transcribe(file_path)
        logger.info("Transcription complete.")
        return result["text"]
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return f"Error during transcription: {e}"

@mcp.tool()
def classify_prompt(prompt: str) -> str:
    """
    Cost-Aware LLM Routing: Uses NadirClaw local prompt classification to determine
    if a prompt should be routed to a 'simple' (cheap/local) or 'complex' (expensive/cloud) model.
    """
    logger.info(f"Classifying prompt for routing...")
    try:
        r = subprocess.run(
            ["nadirclaw", "classify", "--format", "json", prompt],
            capture_output=True, text=True, timeout=60
        )
        if r.returncode != 0:
            logger.error(f"Nadirclaw error: {r.stderr}")
            return json.dumps({"tier": "complex", "error": "Classification failed, defaulting to complex."})
        return r.stdout.strip()
    except Exception as e:
        return json.dumps({"tier": "complex", "error": str(e)})

@mcp.tool()
def validate_risk_control(control_id: str) -> str:
    """
    Executes a Risk Control Validation script securely via Trusted Remote Execution (Rex).

    Args:
        control_id: The ID of the control to validate (e.g., 'validate_mfa').
    """
    logger.info(f"Starting Risk Control Validation via Rex for {control_id}...")

    try:
        # Run the specific Rex script for this control
        validation_data = run_rex_script(control_id)
    except Exception as e:
        return f"Error executing secure validation script: {e}"

    evidence = {
        "evidence_id": str(uuid.uuid4()),
        "collector_name": f"risk_validator_{control_id}",
        "collection_timestamp": datetime.now(timezone.utc).isoformat(),
        "evidence_payload": validation_data,
        "schema_version": "1.0.0"
    }

    # Cryptographically sign the validation attestation
    signed_envelope = sign_evidence(evidence)

    return f"Risk Control Validation complete for {control_id}:\n{json.dumps(signed_envelope)}"

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
