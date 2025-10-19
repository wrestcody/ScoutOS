variable "bucket_name" {
  description = "The name of the S3 bucket for evidence storage."
  type        = string
}

variable "kms_key_alias" {
  description = "The alias for the KMS key used for SSE-KMS encryption."
  type        = string
  default     = "alias/scoutos-evidence-key"
}