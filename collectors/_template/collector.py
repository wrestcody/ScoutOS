import os
import boto3
import json
import logging
import uuid
from datetime import datetime, timezone

# --------------------------------------------------------------------------------------------------
# Configure Logging
# --------------------------------------------------------------------------------------------------
# Use INFO for normal operational messages
# Use DEBUG for detailed diagnostic information
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------------------------------
# Environment Variables
# --------------------------------------------------------------------------------------------------
# These variables are expected to be set in the Lambda function's configuration
EVIDENCE_BUCKET = os.environ.get('EVIDENCE_BUCKET')
SECRET_NAME = os.environ.get('SECRET_NAME') # The name of the secret in AWS Secrets Manager
TARGET_ACCOUNT_ID = os.environ.get('TARGET_ACCOUNT_ID') # The account being audited
COLLECTOR_NAME = "my-awesome-collector" # TODO: Change this for each new collector
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
        # Depending on the secret type, you might need to parse 'SecretString' or decode 'SecretBinary'
        if 'SecretString' in response:
            return json.loads(response['SecretString'])
        else:
            # Handle binary secrets if necessary
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

    # 1. Check for required environment variables
    if not all([EVIDENCE_BUCKET, SECRET_NAME, TARGET_ACCOUNT_ID]):
        logger.error("Missing one or more required environment variables.")
        return {"status": "error", "message": "Missing environment variables."}

    try:
        # 2. (Optional) Retrieve credentials or API keys from Secrets Manager
        # api_keys = get_secret(SECRET_NAME)
        # api_key = api_keys.get('my_api_key') # Example

        # 3. **IMPLEMENT COLLECTION LOGIC HERE**
        # This is the core part of the collector.
        # - Make API calls to the target service.
        # - Process the response data.
        # - The result should be a JSON-serializable dictionary or list.
        logger.info("Fetching data from the target service...")

        # --- start of placeholder ---
        # Replace this with your actual data collection logic
        collected_data = {
            "example_key": "example_value",
            "collected_at": datetime.now(timezone.utc).isoformat()
        }
        # --- end of placeholder ---

        logger.info("Successfully fetched data.")

        # 4. Create the standardized evidence object
        evidence = create_evidence_object(collected_data)

        # 5. Write the evidence to the S3 data lake
        file_name = f"{COLLECTOR_NAME}/{TARGET_ACCOUNT_ID}/{evidence['evidence_id']}.json"
        write_to_s3(EVIDENCE_BUCKET, file_name, evidence)

        logger.info("Collector execution finished successfully.")
        return {"status": "success"}

    except Exception as e:
        logger.error(f"An unhandled error occurred: {e}")
        # This will cause the Lambda function to fail
        raise

if __name__ == "__main__":
    # This block allows for local testing without a Lambda environment.
    # You would need to mock environment variables and boto3 clients.
    # Example:
    # os.environ['EVIDENCE_BUCKET'] = 'my-test-bucket'
    # os.environ['SECRET_NAME'] = 'my-test-secret'
    # os.environ['TARGET_ACCOUNT_ID'] = '123456789012'
    # handler(None, None)
    pass