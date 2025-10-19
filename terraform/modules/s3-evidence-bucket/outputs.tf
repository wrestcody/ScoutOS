output "bucket_id" {
  description = "The name/ID of the S3 bucket."
  value       = aws_s3_bucket.evidence_bucket.id
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket."
  value       = aws_s3_bucket.evidence_bucket.arn
}

output "kms_key_arn" {
  description = "The ARN of the KMS key."
  value       = aws_kms_key.evidence_key.arn
}