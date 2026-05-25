import json
import time
from typing import List, Dict, Any

import boto3
from botocore.exceptions import ClientError


def list_buckets_encryption(s3_client) -> List[Dict[str, Any]]:
    buckets_resp = s3_client.list_buckets()
    results: List[Dict[str, Any]] = []
    for b in buckets_resp.get("Buckets", []):
        name = b.get("Name")
        is_encrypted = False
        kms_key_id = ""
        algo = ""
        try:
            enc = s3_client.get_bucket_encryption(Bucket=name)
            rules = enc.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
            if rules:
                rule = rules[0].get("ApplyServerSideEncryptionByDefault", {})
                algo = rule.get("SSEAlgorithm", "")
                kms_key_id = rule.get("KMSMasterKeyID", "")
                is_encrypted = True
        except ClientError as e:
            code = e.response.get("Error", {}).get("Code")
            if code == "ServerSideEncryptionConfigurationNotFoundError":
                is_encrypted = False
            else:
                # propagate unexpected errors
                raise
        results.append({
            "bucket": name,
            "isEncrypted": is_encrypted,
            "sseAlgorithm": algo,
            "kmsKeyId": kms_key_id,
        })
    return results


def make_response(status: str, evidence_items: List[Any], correlation_id: str, error_code: str = "", error_message: str = "", start_time: float = 0.0) -> Dict[str, Any]:
    duration_ms = int((time.time() - start_time) * 1000) if start_time else 0
    return {
        "status": status,
        "evidence": {"count": len(evidence_items), "items": evidence_items},
        "timingMs": duration_ms,
        "meta": {"provider": "aws", "service": "s3"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = event.get("correlationId", "")
    try:
        s3 = boto3.client("s3")
        items = list_buckets_encryption(s3)
        return make_response("SUCCESS", items, correlation_id, start_time=start)
    except ClientError as e:
        return make_response("FAILURE", [], correlation_id, error_code="AWS_CLIENT_ERROR", error_message=str(e), start_time=start)
    except Exception as e:
        return make_response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start_time=start)

