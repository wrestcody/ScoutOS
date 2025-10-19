data "archive_file" "iam_collector" {
  type        = "zip"
  source_file = "${path.module}/collector.py"
  output_path = "${path.module}/collector.zip"
}

resource "aws_lambda_function" "iam_collector" {
  function_name = "scoutos-aws-iam-password-policy-collector"
  handler       = "collector.handler"
  runtime       = "python3.9"
  filename      = data.archive_file.iam_collector.output_path
  source_code_hash = data.archive_file.iam_collector.output_base64sha256
  role          = aws_iam_role.iam_collector_role.arn

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      EVIDENCE_BUCKET   = var.evidence_bucket_name
      TARGET_ACCOUNT_ID = var.target_account_id
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.default_security_group_id] # A default SG for outbound traffic
  }
}

resource "aws_iam_role" "iam_collector_role" {
  name                 = "scoutos-iam-collector-role"
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume_role.json
  permissions_boundary = var.permissions_boundary_arn
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "iam_collector_policy" {
  name = "scoutos-iam-collector-policy"
  role = aws_iam_role.iam_collector_role.id

  policy = data.aws_iam_policy_document.iam_collector_policy_doc.json
}

data "aws_iam_policy_document" "iam_collector_policy_doc" {
  statement {
    sid    = "AllowIAMPasswordPolicyRead"
    effect = "Allow"
    actions = [
      "iam:GetAccountPasswordPolicy"
    ]
    resources = ["*"] # This action does not support resource-level permissions
  }
}