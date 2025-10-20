# --------------------------------------------------------------------------------------------------
# Lambda Layer for Python Dependencies
# --------------------------------------------------------------------------------------------------
resource "aws_lambda_layer_version" "github_collector_layer" {
  layer_name = "scoutos-github-collector-layer"
  # This assumes you have a `python` directory with the requests library installed.
  # You would typically create this with `pip install requests -t python`
  filename   = "${path.module}/layer.zip"
  compatible_runtimes = ["python3.9"]
}

# --------------------------------------------------------------------------------------------------
# Lambda Function
# --------------------------------------------------------------------------------------------------
data "archive_file" "github_collector" {
  type        = "zip"
  source_file = "${path.module}/collector.py"
  output_path = "${path.module}/collector.zip"
}

resource "aws_lambda_function" "github_collector" {
  function_name = "scoutos-github-branch-protection-collector"
  handler       = "collector.handler"
  runtime       = "python3.9"
  filename      = data.archive_file.github_collector.output_path
  source_code_hash = data.archive_file.github_collector.output_base64sha256
  role          = aws_iam_role.github_collector_role.arn
  layers        = [aws_lambda_layer_version.github_collector_layer.arn]

  tracing_config {
    mode = "Active"
  }

  environment {
    variables = {
      EVIDENCE_BUCKET   = var.evidence_bucket_name
      TARGET_ACCOUNT_ID = var.target_account_id # GitHub Org/User
      SECRET_NAME       = var.github_secret_name
      GITHUB_REPO       = var.github_repo
      GITHUB_BRANCH     = var.github_branch
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.default_security_group_id]
  }
}

# --------------------------------------------------------------------------------------------------
# IAM Role & Policy
# --------------------------------------------------------------------------------------------------
resource "aws_iam_role" "github_collector_role" {
  name                 = "scoutos-github-collector-role"
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume_role.json
  permissions_boundary = var.permissions_boundary_arn
}

resource "aws_iam_role_policy" "github_collector_policy" {
  name = "scoutos-github-collector-policy"
  role = aws_iam_role.github_collector_role.id

  policy = data.aws_iam_policy_document.github_collector_policy_doc.json
}

data "aws_iam_policy_document" "github_collector_policy_doc" {
  statement {
    sid    = "AllowSecretRead"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue"
    ]
    resources = [var.github_secret_arn]
  }
}