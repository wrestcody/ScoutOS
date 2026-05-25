variable "environment" {
  description = "Deployment environment label (e.g., dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "grc_queue_name" {
  description = "Name of the GRC exceptions queue"
  type        = string
  default     = "GRC-Exceptions"
}

variable "golden_table_prefix" {
  description = "Prefix for GRC golden record Data Tables"
  type        = string
  default     = "GRC_GOLDEN_"
}

variable "aws_region" {
  description = "AWS region to compose Lambda ARNs in Data Actions"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID hosting the Lambda functions"
  type        = string
}

variable "aws_lambda_integration_id" {
  description = "Genesys Cloud AWS Lambda integration ID for Data Actions"
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Project name to compose Lambda function names"
  type        = string
  default     = "genesys-grc-poc"
}

variable "enable_flows" {
  description = "Whether to create Architect flow resources (requires flow JSON files)"
  type        = bool
  default     = false
}

