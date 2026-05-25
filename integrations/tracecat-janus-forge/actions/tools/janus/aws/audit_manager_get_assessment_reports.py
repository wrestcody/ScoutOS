from __future__ import annotations

from typing import Any, Dict, List

import boto3
from botocore.config import Config
from tracecat_registry import RegistrySecret, registry


@registry.register(
    name="tools.janus.aws.audit_manager_get_assessment_reports",
    description="List AWS Audit Manager assessment reports for a given assessment ID.",
    secrets=[
        RegistrySecret(name="AWS_REGION", description="AWS region", env_var="AWS_REGION"),
        RegistrySecret(name="AWS_ACCESS_KEY_ID", description="AWS access key", env_var="AWS_ACCESS_KEY_ID", optional=True),
        RegistrySecret(name="AWS_SECRET_ACCESS_KEY", description="AWS secret key", env_var="AWS_SECRET_ACCESS_KEY", optional=True),
        RegistrySecret(name="AWS_SESSION_TOKEN", description="AWS session token", env_var="AWS_SESSION_TOKEN", optional=True),
    ],
)
def audit_manager_get_assessment_reports(assessment_id: str) -> Dict[str, Any]:
    client = boto3.client("auditmanager", config=Config(retries={"max_attempts": 5, "mode": "standard"}))

    paginator = client.get_paginator("list_assessment_reports")
    pages = paginator.paginate(assessmentId=assessment_id)

    reports: List[Dict[str, Any]] = []
    for page in pages:
        reports.extend(page.get("assessmentReports", []))

    return {"assessmentReports": reports}

