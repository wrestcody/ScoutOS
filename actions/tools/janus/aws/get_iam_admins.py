from __future__ import annotations

from typing import Any, Dict, List

import boto3
from botocore.config import Config
from tracecat_registry import RegistrySecret, registry


@registry.register(
    name="tools.janus.aws.get_iam_admins",
    description="List IAM users with Administrator-level permissions (attached AdministratorAccess or equivalent).",
    secrets=[
        RegistrySecret(name="AWS_REGION", description="AWS region", env_var="AWS_REGION"),
        RegistrySecret(name="AWS_ACCESS_KEY_ID", description="AWS access key", env_var="AWS_ACCESS_KEY_ID", optional=True),
        RegistrySecret(name="AWS_SECRET_ACCESS_KEY", description="AWS secret key", env_var="AWS_SECRET_ACCESS_KEY", optional=True),
        RegistrySecret(name="AWS_SESSION_TOKEN", description="AWS session token", env_var="AWS_SESSION_TOKEN", optional=True),
    ],
)
def get_iam_admins() -> Dict[str, Any]:
    iam = boto3.client("iam", config=Config(retries={"max_attempts": 5, "mode": "standard"}))

    admins: List[Dict[str, Any]] = []

    paginator = iam.get_paginator("list_users")
    for page in paginator.paginate():
        for user in page.get("Users", []):
            user_name = user["UserName"]

            # Check attached managed policies
            attached = iam.list_attached_user_policies(UserName=user_name).get("AttachedPolicies", [])
            if any(p["PolicyName"] == "AdministratorAccess" for p in attached):
                admins.append({"userName": user_name, "path": user.get("Path")})
                continue

            # Check inline policies for administrative privileges (heuristic)
            inline_names = iam.list_user_policies(UserName=user_name).get("PolicyNames", [])
            for pol_name in inline_names:
                pol_doc = iam.get_user_policy(UserName=user_name, PolicyName=pol_name)["PolicyDocument"]
                statements = pol_doc.get("Statement", [])
                if not isinstance(statements, list):
                    statements = [statements]
                for stmt in statements:
                    effect = stmt.get("Effect")
                    action = stmt.get("Action")
                    resource = stmt.get("Resource")
                    if effect == "Allow" and (action == "*" or action == ["*"]) and (resource == "*" or resource == ["*"]):
                        admins.append({"userName": user_name, "policy": pol_name})
                        break

    return {"users": admins}

