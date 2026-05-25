import time
from typing import Dict, Any, List

import boto3
from botocore.exceptions import ClientError


def list_open_sg_rules() -> List[Dict[str, Any]]:
    ec2 = boto3.client("ec2")
    resp = ec2.describe_security_groups()
    findings: List[Dict[str, Any]] = []
    for sg in resp.get("SecurityGroups", []):
        for perm in sg.get("IpPermissions", []):
            for ip in perm.get("IpRanges", []):
                cidr = ip.get("CidrIp")
                if cidr == "0.0.0.0/0":
                    findings.append({
                        "type": "SG_OPEN_INGRESS",
                        "groupId": sg.get("GroupId"),
                        "fromPort": perm.get("FromPort"),
                        "toPort": perm.get("ToPort"),
                        "protocol": perm.get("IpProtocol"),
                        "cidr": cidr,
                    })
    return findings


def list_public_buckets() -> List[Dict[str, Any]]:
    s3 = boto3.client("s3")
    resp = s3.list_buckets()
    findings: List[Dict[str, Any]] = []
    for b in resp.get("Buckets", []):
        name = b.get("Name")
        is_public = False
        reason = ""
        try:
            pab = s3.get_public_access_block(Bucket=name)
            cfg = pab.get("PublicAccessBlockConfiguration", {})
            # If any protections are off, treat as potentially public
            if not all([
                cfg.get("BlockPublicAcls", False),
                cfg.get("IgnorePublicAcls", False),
                cfg.get("BlockPublicPolicy", False),
                cfg.get("RestrictPublicBuckets", False),
            ]):
                is_public = True
                reason = "PublicAccessBlock not fully restrictive"
        except ClientError:
            # No PublicAccessBlock -> more likely public
            is_public = True
            reason = "No PublicAccessBlock"
        if is_public:
            findings.append({"type": "S3_PUBLIC_BUCKET", "bucket": name, "reason": reason})
    return findings


def get_iam_password_policy() -> Dict[str, Any]:
    iam = boto3.client("iam")
    try:
        pol = iam.get_account_password_policy()["PasswordPolicy"]
        return {"type": "IAM_PASSWORD_POLICY", **pol}
    except iam.exceptions.NoSuchEntityException:
        return {"type": "IAM_PASSWORD_POLICY", "present": False}


def make_response(status: str, payload: Dict[str, Any], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    items = [payload]
    return {
        "status": status,
        "evidence": {"count": 1, "items": items},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "aws"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    try:
        payload = {
            "securityGroupsOpen": list_open_sg_rules(),
            "publicBuckets": list_public_buckets(),
            "iamPasswordPolicy": get_iam_password_policy(),
        }
        return make_response("SUCCESS", payload, correlation_id, start=start)
    except Exception as e:
        return make_response("FAILURE", {}, correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

