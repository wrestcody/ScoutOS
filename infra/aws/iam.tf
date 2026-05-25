resource "aws_iam_role" "lambda_with_secrets_role" {
  name               = "${var.project_name}-lambda-with-secrets-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role" "lambda_s3_role" {
  name               = "${var.project_name}-lambda-s3-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "lambda_basic_logs" {
  name   = "${var.project_name}-lambda-basic-logs-${var.environment}"
  policy = data.aws_iam_policy_document.lambda_basic_logs.json
}

data "aws_iam_policy_document" "lambda_basic_logs" {
  statement {
    actions   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "secrets_read" {
  name   = "${var.project_name}-secrets-read-${var.environment}"
  policy = data.aws_iam_policy_document.secrets_read.json
}

data "aws_iam_policy_document" "secrets_read" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = compact([
      var.okta_token_secret_arn,
      var.jira_secret_arn,
      var.vendor_score_secret_arn,
      var.workday_secret_arn,
      var.evidence_webhook_secret_arn
    ])
  }
}

resource "aws_iam_policy" "s3_read_encryption" {
  name   = "${var.project_name}-s3-read-encryption-${var.environment}"
  policy = data.aws_iam_policy_document.s3_read_encryption.json
}

data "aws_iam_policy_document" "s3_read_encryption" {
  statement {
    actions   = ["s3:ListAllMyBuckets", "s3:GetBucketEncryption", "s3:GetPublicAccessBlock"]
    resources = ["*"]
  }
}

data "aws_iam_policy_document" "evidence_put_object" {
  statement {
    actions   = ["s3:PutObject", "s3:AbortMultipartUpload"]
    resources = [
      "arn:aws:s3:::${var.evidence_s3_bucket}/${var.evidence_s3_prefix}*"
    ]
  }
}

resource "aws_iam_policy" "evidence_put_object" {
  name   = "${var.project_name}-evidence-put-${var.environment}"
  policy = data.aws_iam_policy_document.evidence_put_object.json
}

resource "aws_iam_role_policy_attachment" "lambda_with_secrets_logs" {
  role       = aws_iam_role.lambda_with_secrets_role.name
  policy_arn = aws_iam_policy.lambda_basic_logs.arn
}

resource "aws_iam_role_policy_attachment" "lambda_with_secrets_sm" {
  role       = aws_iam_role.lambda_with_secrets_role.name
  policy_arn = aws_iam_policy.secrets_read.arn
}

resource "aws_iam_role_policy_attachment" "lambda_s3_logs" {
  role       = aws_iam_role.lambda_s3_role.name
  policy_arn = aws_iam_policy.lambda_basic_logs.arn
}

resource "aws_iam_role_policy_attachment" "lambda_s3_encryption" {
  role       = aws_iam_role.lambda_s3_role.name
  policy_arn = aws_iam_policy.s3_read_encryption.arn
}

resource "aws_iam_role_policy_attachment" "lambda_s3_evidence_put" {
  role       = aws_iam_role.lambda_s3_role.name
  policy_arn = aws_iam_policy.evidence_put_object.arn
}

