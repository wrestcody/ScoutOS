import os
import boto3
import json
import logging
import uuid
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
TARGET_ACCOUNT_ID = os.environ.get('TARGET_ACCOUNT_ID')
COLLECTOR_NAME = "aws-iam-password-policy"
SCHEMA_VERSION = "1.0.0"

# --------------------------------------------------------------------------------------------------
# Boto3 Clients
# --------------------------------------------------------------------------------------------------
s3_client = boto3.client('s3')
iam_client = boto3.client('iam')

# --------------------------------------------------------------------------------------------------
# Helper Functions
# --------------------------------------------------------------------------------------------------
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

    if not all([EVIDENCE_BUCKET, TARGET_ACCOUNT_ID]):
        logger.error("Missing one or more required environment variables.")
        return {"status": "error", "message": "Missing environment variables."}

    try:
        logger.info("Fetching IAM password policy...")

        try:
            response = iam_client.get_account_password_policy()
            collected_data = response['PasswordPolicy']
        except iam_client.exceptions.NoSuchEntityException:
            logger.warning("No IAM password policy found for this account.")
            collected_data = {"error": "NoPasswordPolicyFound"}

        logger.info("Successfully fetched data.")

        evidence = create_evidence_object(collected_data)

        file_name = f"{COLLECTOR_NAME}/{TARGET_ACCOUNT_ID}/{evidence['evidence_id']}.json"
        write_to_s3(EVIDENCE_BUCKET, file_name, evidence)

        logger.info("Collector execution finished successfully.")
        return {"status": "success"}

    except Exception as e:
        logger.error(f"An unhandled error occurred: {e}")
        raise

if __name__ == "__main__":
    pass