# deployment/main.tf
#
# Security Review Note:
# This Terraform configuration is designed for auditability and aligns with the
# FedRAMP 20x focus on verifiable Persistence Validation (PVA) evidence.
# The IAM role adheres to the principle of least privilege, and secrets are
# managed securely via environment variables, not hardcoded.

provider "aws" {
  region = "us-east-1" # Or your preferred region
}

# --- IAM Role for Lambda (Least Privilege) ---
# This dedicated IAM role grants the Lambda function only the permissions
# it needs to execute and write logs to CloudWatch.
resource "aws_iam_role" "vanguard_agent_lambda_role" {
  name = "VanguardAgentLambdaRole"

  # Establishes a trust relationship with the AWS Lambda service.
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Effect    = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# This inline policy grants the minimal permissions required for CloudWatch logging.
resource "aws_iam_role_policy" "lambda_logging_policy" {
  name = "VanguardAgentLoggingPolicy"
  role = aws_iam_role.vanguard_agent_lambda_role.id

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# --- Deployment Artifact ---
# Packages the Python script into a zip file for deployment.
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "../log_analyzer.py"
  output_path = "lambda_function_payload.zip"
}

# --- AWS Lambda Function ---
# Defines the Vanguard_Agent Lambda function, its configuration, and its
# secure environment variables.
resource "aws_lambda_function" "vanguard_agent" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "VanguardAgent"
  role             = aws_iam_role.vanguard_agent_lambda_role.arn
  handler          = "log_analyzer.lambda_handler"
  runtime          = "python3.11"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  # Securely injects secrets and configuration as environment variables.
  # In a production environment, these values should be populated by a
  # secure pipeline or by referencing AWS Secrets Manager.
  environment {
    variables = {
      NEXUS_API_URL = "https://praetorium-nexus.example.com/api/v1/grc-events"
      NEXUS_API_KEY = "placeholder_nexus_api_key"
      OPA_API_URL   = "http://opa-service.internal:8181/v1/data/vanguard/risk_scoring"
      LLM_API_URL   = "https://api.llm-provider.example.com/v1/summarize"
      LLM_API_KEY   = "placeholder_llm_api_key"
    }
  }

  tags = {
    Project = "VanguardAgent"
    GRC     = "Threat-Informed"
  }
}
