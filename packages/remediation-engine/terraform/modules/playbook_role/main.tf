# -----------------------------------------------------------------------------
# Playbook IAM Role Module
#
# This module creates a dedicated, least-privilege IAM role for a single
# GRC-as-Code remediation playbook.
# -----------------------------------------------------------------------------

variable "playbook_name" {
  description = "The unique name of the playbook (e.g., 'cm6_s3_public_access_fix')."
  type        = string
}

variable "iam_policy_description" {
  description = "A description for the IAM policy."
  type        = string
}

variable "iam_policy_json" {
  description = "The JSON content of the IAM policy."
  type        = string
}

variable "tags" {
  description = "A map of tags to assign to the resources."
  type        = map(string)
  default     = {}
}

# --- Assume Role Policy for SSM ---
data "aws_iam_policy_document" "ssm_assume_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ssm.amazonaws.com"]
    }
  }
}

# --- IAM Role ---
resource "aws_iam_role" "playbook_execution_role" {
  name               = "PraetoriumNexus-${var.playbook_name}-Role"
  assume_role_policy = data.aws_iam_policy_document.ssm_assume_role_policy.json
  tags = merge(var.tags, {
    "Playbook" = var.playbook_name
  })
}

# --- IAM Policy ---
resource "aws_iam_policy" "playbook_policy" {
  name        = "PraetoriumNexus-${var.playbook_name}-Policy"
  description = var.iam_policy_description
  policy      = var.iam_policy_json
}

# --- Policy Attachment ---
resource "aws_iam_role_policy_attachment" "playbook_attach" {
  role       = aws_iam_role.playbook_execution_role.name
  policy_arn = aws_iam_policy.playbook_policy.arn
}

# --- Outputs ---
output "role_arn" {
  description = "The ARN of the created IAM role."
  value       = aws_iam_role.playbook_execution_role.arn
}
