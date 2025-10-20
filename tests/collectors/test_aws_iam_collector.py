import os
import boto3
import json
import pytest
from moto import mock_aws

# Import the handler function from the collector
from collectors.aws_iam.collector import handler


@pytest.fixture
def aws_credentials():
    """Mocked AWS Credentials for moto."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"


@pytest.fixture
def s3_client(aws_credentials):
    with mock_aws():
        yield boto3.client("s3", region_name="us-east-1")


@pytest.fixture
def iam_client(aws_credentials):
    with mock_aws():
        yield boto3.client("iam", region_name="us-east-1")


def test_iam_collector_with_password_policy(s3_client, iam_client, mocker):
    """
    Test the AWS IAM collector's happy path where a password policy exists.
    """
    # 1. Setup the mock environment
    bucket_name = "test-evidence-bucket"
    account_id = "123456789012"
    s3_client.create_bucket(Bucket=bucket_name)

    iam_client.update_account_password_policy(
        MinimumPasswordLength=10,
        RequireSymbols=True
    )

    mocker.patch.dict(os.environ, {
        "EVIDENCE_BUCKET": bucket_name,
        "TARGET_ACCOUNT_ID": account_id
    })

    # 2. Run the collector
    result = handler({}, None)

    # 3. Assert the results
    assert result["status"] == "success"

    # Check that the evidence file was created in S3
    objects = s3_client.list_objects_v2(Bucket=bucket_name)
    assert len(objects["Contents"]) == 1

    key = objects["Contents"][0]["Key"]
    assert key.startswith("aws-iam-password-policy/123456789012/")

    # Check the content of the evidence file
    file_content = s3_client.get_object(
        Bucket=bucket_name, Key=key
    )["Body"].read().decode("utf-8")
    evidence_data = json.loads(file_content)

    assert evidence_data["collector_name"] == "aws-iam-password-policy"
    assert evidence_data["target_account_id"] == account_id
    payload = evidence_data["evidence_payload"]
    assert payload["MinimumPasswordLength"] == 10
    assert payload["RequireSymbols"] is True


def test_iam_collector_without_password_policy(s3_client, iam_client, mocker):
    """
    Test the AWS IAM collector's behavior when no password policy is set.
    """
    # 1. Setup the mock environment
    bucket_name = "test-evidence-bucket"
    account_id = "123456789012"
    s3_client.create_bucket(Bucket=bucket_name)

    # Note: No password policy is created in this test

    mocker.patch.dict(os.environ, {
        "EVIDENCE_BUCKET": bucket_name,
        "TARGET_ACCOUNT_ID": account_id
    })

    # 2. Run the collector
    result = handler({}, None)

    # 3. Assert the results
    assert result["status"] == "success"

    # Check that the evidence file was created in S3
    objects = s3_client.list_objects_v2(Bucket=bucket_name)
    assert len(objects["Contents"]) == 1

    key = objects["Contents"][0]["Key"]

    # Check the content of the evidence file
    file_content = s3_client.get_object(
        Bucket=bucket_name, Key=key
    )["Body"].read().decode("utf-8")
    evidence_data = json.loads(file_content)

    assert evidence_data["evidence_payload"]["error"] == "NoPasswordPolicyFound"