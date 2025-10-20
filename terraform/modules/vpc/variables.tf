variable "vpc_name" {
  description = "The name of the VPC."
  type        = string
  default     = "scoutos-vpc"
}

variable "vpc_cidr_block" {
  description = "The CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "private_subnet_cidr_blocks" {
  description = "A list of CIDR blocks for the private subnets."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "aws_region" {
  description = "The AWS region to deploy resources into."
  type        = string
}

variable "kms_key_arn" {
  description = "The ARN of the KMS key to use for encrypting CloudWatch logs."
  type        = string
  default     = null
}