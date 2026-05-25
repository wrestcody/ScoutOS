import time
from typing import Dict, Any, List

import boto3


def list_security_group_rules() -> List[Dict[str, Any]]:
    ec2 = boto3.client("ec2")
    resp = ec2.describe_security_groups()
    items: List[Dict[str, Any]] = []
    for sg in resp.get("SecurityGroups", []):
        group_id = sg.get("GroupId")
        group_name = sg.get("GroupName")
        vpc_id = sg.get("VpcId")
        for perm in sg.get("IpPermissions", []):
            ip_protocol = perm.get("IpProtocol")
            from_port = perm.get("FromPort")
            to_port = perm.get("ToPort")
            for ip in perm.get("IpRanges", []):
                cidr = ip.get("CidrIp")
                items.append({
                    "groupId": group_id,
                    "groupName": group_name,
                    "vpcId": vpc_id,
                    "protocol": ip_protocol,
                    "fromPort": from_port,
                    "toPort": to_port,
                    "cidr": cidr,
                    "isOpenInternet": cidr == "0.0.0.0/0",
                })
    return items


def make_response(status: str, items: List[Dict[str, Any]], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": len(items), "items": items},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "aws", "service": "ec2"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    try:
        items = list_security_group_rules()
        return make_response("SUCCESS", items, correlation_id, start=start)
    except Exception as e:
        return make_response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

