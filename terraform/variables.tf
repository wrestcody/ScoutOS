variable "aws_region" {
  description = "The AWS region to deploy resources into."
  type        = string
  default     = "us-east-1"
}

variable "evidence_bucket_name" {
  description = "The name of the S3 bucket for evidence storage."
  type        = string
  default     = "scoutos-evidence-store-12345" # Replace with a unique name
}

variable "target_account_id" {
  description = "The AWS Account ID being audited."
  type        = string
}

variable "github_secret_name" {
  description = "The name of the secret in AWS Secrets Manager containing the GitHub token."
  type        = string
}

variable "github_secret_arn" {
  description = "The ARN of the secret in AWS Secrets Manager containing the GitHub token."
  type        = string
}

variable "github_organization" {
  description = "The GitHub organization or user to inspect."
  type        = string
}

variable "github_repo" {
  description = "The GitHub repository to inspect (e.g., 'my-repo')."
  type        = string
}

variable "github_branch" {
  description = "The branch to inspect in the GitHub repository."
  type        = string
  default     = "main"
}