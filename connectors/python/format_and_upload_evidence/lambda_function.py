import csv
import io
import json
import os
import time
from typing import List, Dict, Any

import boto3


EVIDENCE_S3_BUCKET = os.environ.get("EVIDENCE_S3_BUCKET", "")
EVIDENCE_S3_PREFIX = os.environ.get("EVIDENCE_S3_PREFIX", "evidence/")


def to_csv(rows: List[Dict[str, Any]]) -> bytes:
    if not rows:
        return b""
    fieldnames = sorted({k for r in rows for k in r.keys()})
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    for r in rows:
        writer.writerow({k: json.dumps(v) if isinstance(v, (dict, list)) else v for k, v in r.items()})
    return buf.getvalue().encode("utf-8")


def upload_csv(data: bytes, filename: str) -> str:
    s3 = boto3.client("s3")
    key = EVIDENCE_S3_PREFIX.rstrip("/") + "/" + filename
    s3.put_object(Bucket=EVIDENCE_S3_BUCKET, Key=key, Body=data, ContentType="text/csv")
    return f"s3://{EVIDENCE_S3_BUCKET}/{key}"


def make_response(status: str, location: str, correlation_id: str, error_code: str = "", error_message: str = "", start: float = 0.0) -> Dict[str, Any]:
    evidence = {"location": location}
    return {
        "status": status,
        "evidence": {"count": 1 if location else 0, "items": [evidence] if location else []},
        "timingMs": int((time.time() - start) * 1000) if start else 0,
        "meta": {"provider": "aws-s3"},
        "error": {"code": error_code, "message": error_message},
        "correlationId": correlation_id,
    }


def lambda_handler(event, _context):
    start = time.time()
    correlation_id = (event or {}).get("correlationId", "")
    params = (event or {}).get("params", {}) or {}
    try:
        if not EVIDENCE_S3_BUCKET:
            raise RuntimeError("Missing EVIDENCE_S3_BUCKET env var")
        rows = params.get("rows") or []
        filename = params.get("filename") or f"grc-evidence-{int(time.time())}.csv"
        data = to_csv(rows)
        location = upload_csv(data, filename)
        return make_response("SUCCESS", location, correlation_id, start=start)
    except Exception as e:
        return make_response("FAILURE", "", correlation_id, error_code="UNEXPECTED", error_message=str(e), start=start)

