import time
from typing import Dict, Any, List

import boto3


def list_admin_group_users(group_name: str) -> List[Dict[str, Any]]:
    iam = boto3.client("iam")
    paginator = iam.get_paginator("get_group")
    users: List[Dict[str, Any]] = []
    for page in paginator.paginate(GroupName=group_name):
        for u in page.get("Users", []):
            users.append({
                "userName": u.get("UserName"),
                "userId": u.get("UserId"),
                "arn": u.get("Arn"),
                "createDate": u.get("CreateDate").isoformat() if u.get("CreateDate") else None,
            })
    return users


def make_response(status: str, items: List[Dict[str, Any]], correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    return {
        "status": status,
        "evidence": {"count": len(items), "items": items},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "aws-iam", "group": "Administrators"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    params = (event or {}).get("params", {}) or {}
    group_name = params.get("groupName", "Administrators")
    try:
        items = list_admin_group_users(group_name)
        return make_response("SUCCESS", items, correlation_id, start=start)
    except Exception as e:
        return make_response("FAILURE", [], correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

