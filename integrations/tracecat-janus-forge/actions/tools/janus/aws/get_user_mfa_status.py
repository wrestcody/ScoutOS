from __future__ import annotations

from typing import Any, Dict

import boto3
from botocore.config import Config
from tracecat_registry import RegistrySecret, registry


@registry.register(
    name="tools.janus.aws.get_user_mfa_status",
    description="Return whether a given IAM user has MFA devices configured and enabled.",
    secrets=[
        RegistrySecret(name="AWS_REGION", description="AWS region", env_var="AWS_REGION"),
        RegistrySecret(name="AWS_ACCESS_KEY_ID", description="AWS access key", env_var="AWS_ACCESS_KEY_ID", optional=True),
        RegistrySecret(name="AWS_SECRET_ACCESS_KEY", description="AWS secret key", env_var="AWS_SECRET_ACCESS_KEY", optional=True),
        RegistrySecret(name="AWS_SESSION_TOKEN", description="AWS session token", env_var="AWS_SESSION_TOKEN", optional=True),
    ],
)
def get_user_mfa_status(user_name: str) -> Dict[str, Any]:
    iam = boto3.client("iam", config=Config(retries={"max_attempts": 5, "mode": "standard"}))
    resp = iam.list_mfa_devices(UserName=user_name)
    devices = resp.get("MFADevices", [])
    return {"mfa_enabled": len(devices) > 0, "devices": devices}

