import json
import logging
import os
import boto3

# --- Configuration ---
# Set up logging for clear, actionable output. The log level is configurable
# via a Lambda environment variable, defaulting to "INFO".
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger("praetorian_guard")
logger.setLevel(LOG_LEVEL)

# Initialize the AWS SDK client for Systems Manager (SSM).
# This client is reused for all invocations of the function in the same execution environment.
SSM_CLIENT = boto3.client("ssm")

# --- Dynamic Playbook Discovery ---
# The engine dynamically discovers available playbooks and their required roles
# by inspecting the Lambda's environment variables. This avoids hardcoding
# the mapping and makes the system more scalable.
#
# A playbook is identified by an environment variable ending in "_ROLE_ARN".
# The Lambda expects a corresponding variable for the SSM Document Name.
# Example:
#   - CM6_S3_EXECUTION_ROLE_ARN = "arn:aws:iam::..."
#   - CM6_S3_DOCUMENT_NAME      = "PraetoriumNexus-CM-6-S3-Public-Access-Fix"
#
# The control_id from the compliance message (e.g., "NIST-800-53-CM-6") is
# expected to map to the prefix of these environment variables (e.g., "CM6_S3").
# This mapping is configured in the `CONTROL_ID_TO_PLAYBOOK_PREFIX_MAP`.
CONTROL_ID_TO_PLAYBOOK_PREFIX_MAP = {
    "NIST-800-53-CM-6": "CM6_S3"
    # To add a new playbook, add a new mapping here, for example:
    # "NIST-800-53-AC-2": "AC2_IAM"
}

def get_playbook_info(control_id):
    """
    Looks up the playbook information based on the control_id.

    Args:
        control_id (str): The compliance control ID.

    Returns:
        dict: A dictionary containing the DocumentName and RoleArn, or None.
    """
    playbook_prefix = CONTROL_ID_TO_PLAYBOOK_PREFIX_MAP.get(control_id)
    if not playbook_prefix:
        logger.error(f"No playbook prefix found for control_id '{control_id}'.")
        return None

    document_name_var = f"{playbook_prefix}_DOCUMENT_NAME"
    role_arn_var = f"{playbook_prefix}_EXECUTION_ROLE_ARN"

    document_name = os.environ.get(document_name_var)
    role_arn = os.environ.get(role_arn_var)

    if not document_name or not role_arn:
        logger.error(f"Environment variables for playbook '{playbook_prefix}' not fully configured.")
        return None

    return {
        "DocumentName": document_name,
        "RoleArn": role_arn
    }

def lambda_handler(event, context):
    """
    Handles compliance failure notifications from an SQS queue.

    This function is triggered by messages from the KSI_Engine. It parses the
    compliance failure payload (CCE format), identifies the failed control and
    the target resource, and then triggers the correct, pre-approved SSM
    Automation Document to perform remediation.

    The function is designed to be idempotent and resilient. It only acts on
    messages with a "FAIL" status and includes robust error handling to prevent
    infinite reprocessing of malformed messages, recommending the use of a
    Dead-Letter Queue (DLQ) for the source SQS queue.

    Args:
        event (dict): The event payload from the SQS trigger. Expected to contain
                      one or more records, each with a 'body' that is a JSON
                      string in the CCE (Compliance Check Engine) format.
        context (object): The Lambda runtime information. Not used in this function.

    Returns:
        dict: A response object with a status code and a body, indicating
              that the processing is complete.
    """
    logger.info(f"Received {len(event.get('Records', []))} event record(s).")

    # Process each message from the SQS batch.
    for record in event.get("Records", []):
        try:
            # The message body from SQS is a JSON string, so it must be parsed.
            cce_payload = json.loads(record.get("body", "{}"))
            logger.info(f"Processing CCE payload: {json.dumps(cce_payload)}")

            # Extract key information from the compliance payload.
            control_id = cce_payload.get("control_id")
            target_id = cce_payload.get("target_id") # The resource that failed the check.
            status = cce_payload.get("status")

            # The engine's primary function is to act on failures. Ignore other statuses.
            if status != "FAIL":
                logger.info(f"Skipping payload for {target_id} with status '{status}'. No action needed.")
                continue

            # --- Dynamic Playbook and Role Lookup ---
            playbook_info = get_playbook_info(control_id)
            if not playbook_info:
                # Error is logged within the helper function
                continue

            playbook_name = playbook_info["DocumentName"]
            automation_assume_role_arn = playbook_info["RoleArn"]
            # --- End Lookup ---

            # --- Generic Parameter Parsing ---
            # This logic dynamically determines the correct parameter name
            # based on the resource type derived from the ARN.
            # This makes the engine extensible to new resource types.
            def get_target_parameter(target_arn):
                # Format: arn:partition:service:region:account-id:resource-id
                # Format: arn:partition:service:region:account-id:resource-type/resource-id
                try:
                    service = target_arn.split(":")[2]
                    resource_parts = target_arn.split(":")[-1].split("/")

                    if service == "s3":
                        return {"BucketName": [resource_parts[0]]}
                    elif service == "iam" and resource_parts[0] == "user":
                        return {"UserName": [resource_parts[1]]}
                    # Add more service/resource parsers here...
                    else:
                        return None
                except IndexError:
                    return None

            target_param = get_target_parameter(target_id)
            if not target_param:
                logger.error(f"Could not parse target_id '{target_id}' into a valid playbook parameter.")
                continue
            # --- End Parameter Parsing ---

            logger.warning(f"Executing remediation playbook '{playbook_name}' for target '{target_id}'...")

            # --- AUTOMATED ENFORCEMENT (KSI-CNA-08) ---
            # Trigger the SSM Automation Document. The 'AutomationAssumeRole' is a critical
            # security control, ensuring the playbook runs with only the permissions
            # defined in its dedicated role, not the Lambda's broader permissions.
            response = SSM_CLIENT.start_automation_execution(
                DocumentName=playbook_name,
                Parameters={
                    **target_param,
                    "AutomationAssumeRole": [automation_assume_role_arn]
                },
                Tags=[
                    {"Key": "TriggeredBy", "Value": "Praetorian_Guard_Lambda"},
                    {"Key": "ControlID", "Value": control_id},
                    {"Key": "TargetID", "Value": target_id}
                ]
            )
            # --- End Enforcement ---

            logger.info(f"Successfully triggered automation. ExecutionId: {response['AutomationExecutionId']}")

        except json.JSONDecodeError:
            logger.error(f"Failed to decode SQS message body: {record.get('body')}")
        except Exception as e:
            logger.error(f"An unexpected error occurred while processing record: {e}", exc_info=True)
            # Do not re-raise. This prevents the message from being re-processed
            # and potentially causing an infinite loop. The SQS queue's DLQ
            # should be configured to capture these failed messages for analysis.

    return {
        "statusCode": 200,
        "body": "Processing complete."
    }
