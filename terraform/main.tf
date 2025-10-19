terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.2"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "evidence_bucket" {
  source      = "./modules/s3-evidence-bucket"
  bucket_name = var.evidence_bucket_name
}

module "vpc" {
  source      = "./modules/vpc"
  aws_region  = var.aws_region
  kms_key_arn = module.evidence_bucket.kms_key_arn
}

module "permissions_boundary" {
  source              = "./modules/iam-permissions-boundary"
  evidence_bucket_arn = module.evidence_bucket.bucket_arn
}

resource "aws_security_group" "lambda_sg" { # tfsec:ignore:aws-ec2-no-public-egress-sgr
  name        = "scoutos-lambda-sg"
  description = "Security group for scoutos Lambda functions"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic to the internet"
  }
}

module "aws_iam_collector" {
  source                  = "../collectors/aws-iam"
  evidence_bucket_name    = var.evidence_bucket_name
  target_account_id       = var.target_account_id
  private_subnet_ids      = module.vpc.private_subnet_ids
  default_security_group_id = aws_security_group.lambda_sg.id
  permissions_boundary_arn = module.permissions_boundary.policy_arn
}

module "github_collector" {
  source                    = "../collectors/github"
  evidence_bucket_name      = var.evidence_bucket_name
  target_account_id         = var.github_organization
  private_subnet_ids        = module.vpc.private_subnet_ids
  default_security_group_id = aws_security_group.lambda_sg.id
  permissions_boundary_arn  = module.permissions_boundary.policy_arn
  github_secret_name        = var.github_secret_name
  github_secret_arn         = var.github_secret_arn
  github_repo               = var.github_repo
  github_branch             = var.github_branch
}