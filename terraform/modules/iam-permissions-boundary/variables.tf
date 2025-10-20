variable "evidence_bucket_arn" {
  description = "The ARN of the S3 bucket used for evidence storage."
  type        = string
}

variable "policy_name" {
  description = "The name for the IAM permissions boundary policy."
  type        = string
  default     = "scoutos-CollectorPermissionsBoundary"
}