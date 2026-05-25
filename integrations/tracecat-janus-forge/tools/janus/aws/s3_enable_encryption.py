import os
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError


def remediate(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    tools.janus.aws.s3_enable_encryption.remediate

    Inputs:
      - bucket: str
      - algorithm: str (aws:kms or AES256) default AES256
      - kmsKeyId: str (required if algorithm=aws:kms)

    Requires AWS credentials via env or role.
    """
    bucket = event.get("bucket")
    algorithm = event.get("algorithm", "AES256")
    kms_key_id = event.get("kmsKeyId")

    if not bucket:
        return {"status": "failure", "message": "bucket is required"}

    s3 = boto3.client("s3")

    rule: Dict[str, Any]
    if algorithm == "aws:kms":
        if not kms_key_id:
            return {"status": "failure", "message": "kmsKeyId required for aws:kms"}
        rule = {
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "aws:kms",
                "KMSMasterKeyID": kms_key_id,
            }
        }
    else:
        rule = {
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256",
            }
        }

    try:
        s3.put_bucket_encryption(
            Bucket=bucket,
            ServerSideEncryptionConfiguration={
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": rule["ApplyServerSideEncryptionByDefault"],
                        "BucketKeyEnabled": True,
                    }
                ]
            },
        )
        return {"status": "success", "bucket": bucket, "algorithm": algorithm}
    except ClientError as e:
        return {"status": "failure", "message": str(e)}

