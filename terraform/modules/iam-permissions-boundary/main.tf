# --------------------------------------------------------------------------------------------------
# IAM Permissions Boundary Policy
# This policy defines the maximum permissions a collector can have.
# It does not grant permissions, but rather sets the boundary.
# --------------------------------------------------------------------------------------------------
resource "aws_iam_policy" "permissions_boundary" {
  name        = var.policy_name
  path        = "/"
  description = "Permissions boundary for all scoutos collectors."

  policy = data.aws_iam_policy_document.boundary_policy_doc.json
}

data "aws_iam_policy_document" "boundary_policy_doc" {
  statement {
    sid    = "DenyAllExcept"
    effect = "Deny"
    actions = ["*"]
    resources = ["*"]

    condition {
      test     = "StringNotLike"
      variable = "aws:PrincipalTag/scoutos-collector"
      values   = ["true"]
    }
  }

  statement {
    sid       = "AllowScopedActions"
    effect    = "Allow"
    actions   = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "secretsmanager:GetSecretValue",
      "kms:Decrypt",
      "s3:PutObject"
    ]
    resources = [
      "arn:aws:logs:*:*:*",
      "*", # Secrets and KMS keys are scoped in the role
      "${var.evidence_bucket_arn}/*"
    ]
  }
}