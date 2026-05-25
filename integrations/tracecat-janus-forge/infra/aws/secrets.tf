variable "okta_token_secret_arn" {
  description = "Secrets Manager ARN holding Okta API token JSON {token|apiToken}"
  type        = string
  default     = ""
}

variable "okta_org" {
  description = "Default Okta org domain, e.g., acme.okta.com"
  type        = string
  default     = ""
}

variable "jira_secret_arn" {
  description = "Secrets Manager ARN holding Jira credentials {email, apiToken} or {bearer}"
  type        = string
  default     = ""
}

variable "jira_base_url" {
  description = "Base URL for Jira, e.g., https://yourdomain.atlassian.net"
  type        = string
  default     = ""
}

variable "vendor_score_secret_arn" {
  description = "Secrets Manager ARN for vendor security score provider token"
  type        = string
  default     = ""
}

variable "vendor_score_provider" {
  description = "Provider for vendor security score (securityscorecard|upguard)"
  type        = string
  default     = "securityscorecard"
}

variable "workday_secret_arn" {
  description = "Secrets Manager ARN for Workday API credentials"
  type        = string
  default     = ""
}

variable "evidence_webhook_secret_arn" {
  description = "Secrets Manager ARN containing evidence webhook URL (optional)"
  type        = string
  default     = ""
}

variable "evidence_webhook_url" {
  description = "Evidence webhook URL if not using Secrets Manager"
  type        = string
  default     = ""
}

variable "training_secret_arn" {
  description = "Secrets Manager ARN for training platform API token"
  type        = string
  default     = ""
}

variable "training_base_url" {
  description = "Base URL for training platform API"
  type        = string
  default     = ""
}

variable "gc_oauth_secret_arn" {
  description = "Secrets Manager ARN for Genesys Cloud OAuth client (clientId/clientSecret)"
  type        = string
  default     = ""
}

variable "gc_region" {
  description = "Genesys Cloud region (e.g., us-east-1)"
  type        = string
  default     = "us-east-1"
}

variable "gc_login_url" {
  description = "Optional override for Genesys Cloud login URL"
  type        = string
  default     = ""
}

variable "gc_summary_api_url" {
  description = "Genesys Cloud Configurable Agent Copilot Summaries API URL"
  type        = string
  default     = ""
}

variable "gc_bulk_export_base" {
  description = "Genesys Cloud Bulk Export base URL for external contacts"
  type        = string
  default     = ""
}

variable "evidence_s3_bucket" {
  description = "S3 bucket for storing formatted evidence CSVs"
  type        = string
  default     = ""
}

variable "evidence_s3_prefix" {
  description = "S3 prefix for evidence objects"
  type        = string
  default     = "evidence/"
}

variable "bedrock_model_id" {
  description = "Amazon Bedrock model ID for query generation"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "sumo_secret_arn" {
  description = "Secrets Manager ARN for Sumo Logic API credentials (accessId/accessKey)"
  type        = string
  default     = ""
}

variable "sumo_base_url" {
  description = "Base URL for Sumo Logic API, e.g., https://api.us2.sumologic.com"
  type        = string
  default     = ""
}

variable "sumo_source_category" {
  description = "Default Sumo Logic source category for Genesys logs"
  type        = string
  default     = "genesys-cloud-logs"
}

