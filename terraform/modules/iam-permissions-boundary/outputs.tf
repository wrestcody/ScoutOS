output "policy_arn" {
  description = "The ARN of the IAM permissions boundary policy."
  value       = aws_iam_policy.permissions_boundary.arn
}