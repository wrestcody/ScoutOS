import os
import boto3
import json
import logging
import uuid
import requests
from datetime import datetime, timezone

# --------------------------------------------------------------------------------------------------
# Configure Logging
# --------------------------------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------------------------------
# Environment Variables
# --------------------------------------------------------------------------------------------------
EVIDENCE_BUCKET = os.environ.get('EVIDENCE_BUCKET')
SECRET_NAME = os.environ.get('SECRET_NAME')
TARGET_ACCOUNT_ID = os.environ.get('TARGET_ACCOUNT_ID') # GitHub Organization/User
GITHUB_REPO = os.environ.get('GITHUB_REPO')
GITHUB_BRANCH = os.environ.get('GITHUB_BRANCH', 'main')
COLLECTOR_NAME = "github-branch-protection"
SCHEMA_VERSION = "1.0.0"

# --------------------------------------------------------------------------------------------------
# Boto3 Clients
# --------------------------------------------------------------------------------------------------
s3_client = boto3.client('s3')
secrets_manager_client = boto3.client('secretsmanager')

# --------------------------------------------------------------------------------------------------
# Helper Functions
# --------------------------------------------------------------------------------------------------
def get_secret(secret_name):
    """
    Retrieves a secret from AWS Secrets Manager.
    """
    try:
        logger.info(f"Retrieving secret: {secret_name}")
        response = secrets_manager_client.get_secret_value(SecretId=secret_name)
        if 'SecretString' in response:
            return json.loads(response['SecretString'])
        else:
            logger.warning("Secret is binary and not handled by this template.")
            return None
    except Exception as e:
        logger.error(f"Failed to retrieve secret {secret_name}: {e}")
        raise

def write_to_s3(bucket, key, data):
    """
    Writes a dictionary to S3 as a JSON object.
    """
    try:
        logger.info(f"Writing evidence to s3://{bucket}/{key}")
        s3_client.put_object(
            Bucket=bucket,
            Key=key,
            Body=json.dumps(data, indent=2),
            ContentType='application/json'
        )
    except Exception as e:
        logger.error(f"Failed to write to S3 bucket {bucket}: {e}")
        raise

def create_evidence_object(payload):
    """
    Creates a standardized evidence object.
    """
    return {
        "evidence_id": str(uuid.uuid4()),
        "collector_name": COLLECTOR_NAME,
        "collection_timestamp": datetime.now(timezone.utc).isoformat(),
        "target_account_id": TARGET_ACCOUNT_ID,
        "evidence_payload": payload,
        "schema_version": SCHEMA_VERSION
    }

# --------------------------------------------------------------------------------------------------
# Main Handler
# --------------------------------------------------------------------------------------------------
def handler(event, context):
    """
    Main Lambda handler function.
    """
    logger.info("Starting collector execution...")

    if not all([EVIDENCE_BUCKET, SECRET_NAME, TARGET_ACCOUNT_ID, GITHUB_REPO]):
        logger.error("Missing one or more required environment variables.")
        return {"status": "error", "message": "Missing environment variables."}

    try:
        secrets = get_secret(SECRET_NAME)
        github_token = secrets.get('GITHUB_TOKEN')
        if not github_token:
            logger.error("Secret is missing 'GITHUB_TOKEN' key.")
            raise ValueError("GitHub token not found in secret.")

        logger.info(f"Fetching branch protection rules for {TARGET_ACCOUNT_ID}/{GITHUB_REPO} branch {GITHUB_BRANCH}")

        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        url = f"https://api.github.com/repos/{TARGET_ACCOUNT_ID}/{GITHUB_REPO}/branches/{GITHUB_BRANCH}/protection"

        response = requests.get(url, headers=headers)
        response.raise_for_status() # Raises an HTTPError for bad responses (4xx or 5xx)

        collected_data = response.json()

        logger.info("Successfully fetched data.")

        evidence = create_evidence_object(collected_data)

        file_name = f"{COLLECTOR_NAME}/{TARGET_ACCOUNT_ID}-{GITHUB_REPO}/{evidence['evidence_id']}.json"
        write_to_s3(EVIDENCE_BUCKET, file_name, evidence)

        logger.info("Collector execution finished successfully.")
        return {"status": "success"}

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            logger.warning("Branch protection not found. It may not be configured.")
            collected_data = {"error": "BranchProtectionNotFound"}
            evidence = create_evidence_object(collected_data)
            file_name = f"{COLLECTOR_NAME}/{TARGET_ACCOUNT_ID}-{GITHUB_REPO}/{evidence['evidence_id']}.json"
            write_to_s3(EVIDENCE_BUCKET, file_name, evidence)
            return {"status": "success", "message": "Branch protection not found."}
        else:
            logger.error(f"HTTP error occurred: {e}")
            raise
    except Exception as e:
        logger.error(f"An unhandled error occurred: {e}")
        raise

if __name__ == "__main__":
    pass