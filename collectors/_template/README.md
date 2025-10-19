# Collector Template

This directory contains the boilerplate code for a new `scoutos` collector.

## How to Use This Template

1.  **Copy the Directory**: Copy this entire `_template` directory to a new directory under `collectors/`. The new directory name should be descriptive of the collector, for example, `collectors/aws-s3-public-access`.
2.  **Update `collector.py`**:
    *   Change the `COLLECTOR_NAME` variable to a unique, descriptive name (e.g., `aws-s3-public-access`).
    *   Implement your data collection logic in the `handler` function, replacing the placeholder block. This involves making API calls to the target service and processing the response.
    *   If your collector does not need to retrieve secrets from AWS Secrets Manager, you can remove the call to `get_secret`.
3.  **Create `terraform.tf`**: Create a new `terraform.tf` file in your new collector directory. This file will define the necessary infrastructure to deploy your collector as an AWS Lambda function. You will need to define:
    *   An `aws_lambda_function` resource.
    *   An `aws_iam_role` for the Lambda function.
    *   An `aws_iam_role_policy` that grants the specific permissions your collector needs.
    *   An `aws_iam_role_policy_attachment` to attach the `scoutos-CollectorPermissionsBoundary` to the role.
4.  **Add to Root `main.tf`**: Add a module call to your new collector in the root `terraform/main.tf` file to ensure it gets deployed.

## Environment Variables

Your Lambda function will need the following environment variables configured:

*   `EVIDENCE_BUCKET`: The name of the S3 bucket where evidence will be stored.
*   `SECRET_NAME`: The name of the secret in AWS Secrets Manager that holds any necessary API keys or credentials.
*   `TARGET_ACCOUNT_ID`: The ID of the AWS account or environment being audited.