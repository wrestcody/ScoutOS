locals {
  lambda_src_root = "${path.root}/../../connectors/python"
}

data "archive_file" "okta_admins_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/okta_admins_get.zip"
  source_dir  = "${local.lambda_src_root}/okta_admins_get"
}

data "archive_file" "s3_encryption_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/aws_s3_encryption_get.zip"
  source_dir  = "${local.lambda_src_root}/aws_s3_encryption_get"
}

data "archive_file" "jira_issue_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/jira_issue_create.zip"
  source_dir  = "${local.lambda_src_root}/jira_issue_create"
}

data "archive_file" "vendor_security_score_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/vendor_security_score_get.zip"
  source_dir  = "${local.lambda_src_root}/vendor_security_score_get"
}

data "archive_file" "offboarding_terminated_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/offboarding_terminated_employees_get.zip"
  source_dir  = "${local.lambda_src_root}/offboarding_terminated_employees_get"
}

data "archive_file" "check_user_access_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/check_user_access.zip"
  source_dir  = "${local.lambda_src_root}/check_user_access"
}

data "archive_file" "ir_evidence_log_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/ir_evidence_log.zip"
  source_dir  = "${local.lambda_src_root}/ir_evidence_log"
}

data "archive_file" "firewall_rules_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/firewall_rules_get.zip"
  source_dir  = "${local.lambda_src_root}/firewall_rules_get"
}

data "archive_file" "aws_iam_admins_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/aws_iam_admins_get.zip"
  source_dir  = "${local.lambda_src_root}/aws_iam_admins_get"
}

data "archive_file" "aws_security_configs_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/aws_security_configs_get.zip"
  source_dir  = "${local.lambda_src_root}/aws_security_configs_get"
}

data "archive_file" "jira_change_tickets_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/jira_change_tickets_get.zip"
  source_dir  = "${local.lambda_src_root}/jira_change_tickets_get"
}

data "archive_file" "active_employees_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/active_employees_get.zip"
  source_dir  = "${local.lambda_src_root}/active_employees_get"
}

data "archive_file" "training_completions_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/training_completions_get.zip"
  source_dir  = "${local.lambda_src_root}/training_completions_get"
}

data "archive_file" "genesys_cloud_admins_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/genesys_cloud_admins_get.zip"
  source_dir  = "${local.lambda_src_root}/genesys_cloud_admins_get"
}

data "archive_file" "format_and_upload_evidence_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/format_and_upload_evidence.zip"
  source_dir  = "${local.lambda_src_root}/format_and_upload_evidence"
}

data "archive_file" "summarize_privileged_activity_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/summarize_privileged_activity.zip"
  source_dir  = "${local.lambda_src_root}/summarize_privileged_activity"
}

data "archive_file" "generate_vendor_roster_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/generate_vendor_roster.zip"
  source_dir  = "${local.lambda_src_root}/generate_vendor_roster"
}

data "archive_file" "sumo_evidence_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/sumo_evidence_get.zip"
  source_dir  = "${local.lambda_src_root}/sumo_evidence_get"
}

data "archive_file" "forge_augur_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/ForgeTool-QueryTheAugur.zip"
  source_dir  = "${local.lambda_src_root}/ForgeTool-QueryTheAugur"
}

data "archive_file" "forge_vendorledger_zip" {
  type        = "zip"
  output_path = "${path.module}/dist/ForgeTool-VendorLedger.zip"
  source_dir  = "${local.lambda_src_root}/ForgeTool-VendorLedger"
}

resource "aws_lambda_function" "okta_admins_get" {
  function_name = "${var.project_name}-okta-admins-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.okta_admins_zip.output_path
  source_code_hash = data.archive_file.okta_admins_zip.output_base64sha256

  environment {
    variables = {
      OKTA_TOKEN_SECRET_ARN = var.okta_token_secret_arn
      OKTA_ORG               = var.okta_org
    }
  }
}

resource "aws_lambda_function" "aws_s3_encryption_get" {
  function_name = "${var.project_name}-aws-s3-encryption-get-${var.environment}"
  role          = aws_iam_role.lambda_s3_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.s3_encryption_zip.output_path
  source_code_hash = data.archive_file.s3_encryption_zip.output_base64sha256
}

resource "aws_lambda_function" "jira_issue_create" {
  function_name = "${var.project_name}-jira-issue-create-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.jira_issue_zip.output_path
  source_code_hash = data.archive_file.jira_issue_zip.output_base64sha256

  environment {
    variables = {
      JIRA_SECRET_ARN = var.jira_secret_arn
      JIRA_BASE_URL    = var.jira_base_url
    }
  }
}

resource "aws_lambda_function" "vendor_security_score_get" {
  function_name = "${var.project_name}-vendor-security-score-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.vendor_security_score_zip.output_path
  source_code_hash = data.archive_file.vendor_security_score_zip.output_base64sha256

  environment {
    variables = {
      VENDOR_SCORE_SECRET_ARN = var.vendor_score_secret_arn
      VENDOR_SCORE_PROVIDER    = var.vendor_score_provider
    }
  }
}

resource "aws_lambda_function" "offboarding_terminated_employees_get" {
  function_name = "${var.project_name}-offboarding-terminated-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.offboarding_terminated_zip.output_path
  source_code_hash = data.archive_file.offboarding_terminated_zip.output_base64sha256

  environment {
    variables = {
      WORKDAY_SECRET_ARN = var.workday_secret_arn
    }
  }
}

resource "aws_lambda_function" "check_user_access" {
  function_name = "${var.project_name}-check-user-access-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.check_user_access_zip.output_path
  source_code_hash = data.archive_file.check_user_access_zip.output_base64sha256

  environment {
    variables = {
      OKTA_TOKEN_SECRET_ARN = var.okta_token_secret_arn
      OKTA_ORG               = var.okta_org
    }
  }
}

resource "aws_lambda_function" "ir_evidence_log" {
  function_name = "${var.project_name}-ir-evidence-log-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.ir_evidence_log_zip.output_path
  source_code_hash = data.archive_file.ir_evidence_log_zip.output_base64sha256

  environment {
    variables = {
      EVIDENCE_WEBHOOK_SECRET_ARN = var.evidence_webhook_secret_arn
      EVIDENCE_WEBHOOK_URL        = var.evidence_webhook_url
    }
  }
}

resource "aws_lambda_function" "firewall_rules_get" {
  function_name = "${var.project_name}-firewall-rules-get-${var.environment}"
  role          = aws_iam_role.lambda_s3_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.firewall_rules_zip.output_path
  source_code_hash = data.archive_file.firewall_rules_zip.output_base64sha256
}

resource "aws_lambda_function" "aws_iam_admins_get" {
  function_name = "${var.project_name}-aws-iam-admins-get-${var.environment}"
  role          = aws_iam_role.lambda_s3_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.aws_iam_admins_zip.output_path
  source_code_hash = data.archive_file.aws_iam_admins_zip.output_base64sha256
}

resource "aws_lambda_function" "aws_security_configs_get" {
  function_name = "${var.project_name}-aws-security-configs-get-${var.environment}"
  role          = aws_iam_role.lambda_s3_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.aws_security_configs_zip.output_path
  source_code_hash = data.archive_file.aws_security_configs_zip.output_base64sha256
}

resource "aws_lambda_function" "jira_change_tickets_get" {
  function_name = "${var.project_name}-jira-change-tickets-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.jira_change_tickets_zip.output_path
  source_code_hash = data.archive_file.jira_change_tickets_zip.output_base64sha256

  environment {
    variables = {
      JIRA_SECRET_ARN = var.jira_secret_arn
      JIRA_BASE_URL    = var.jira_base_url
    }
  }
}

resource "aws_lambda_function" "active_employees_get" {
  function_name = "${var.project_name}-active-employees-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.active_employees_zip.output_path
  source_code_hash = data.archive_file.active_employees_zip.output_base64sha256

  environment {
    variables = {
      WORKDAY_SECRET_ARN = var.workday_secret_arn
    }
  }
}

resource "aws_lambda_function" "training_completions_get" {
  function_name = "${var.project_name}-training-completions-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.training_completions_zip.output_path
  source_code_hash = data.archive_file.training_completions_zip.output_base64sha256

  environment {
    variables = {
      TRAINING_SECRET_ARN = var.training_secret_arn
      TRAINING_BASE_URL    = var.training_base_url
    }
  }
}

resource "aws_lambda_function" "genesys_cloud_admins_get" {
  function_name = "${var.project_name}-genesys-cloud-admins-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.genesys_cloud_admins_zip.output_path
  source_code_hash = data.archive_file.genesys_cloud_admins_zip.output_base64sha256

  environment {
    variables = {
      GC_OAUTH_SECRET_ARN = var.gc_oauth_secret_arn
      GC_REGION            = var.gc_region
      GC_LOGIN_URL         = var.gc_login_url
    }
  }
}

resource "aws_lambda_function" "format_and_upload_evidence" {
  function_name = "${var.project_name}-format-upload-evidence-${var.environment}"
  role          = aws_iam_role.lambda_s3_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.format_and_upload_evidence_zip.output_path
  source_code_hash = data.archive_file.format_and_upload_evidence_zip.output_base64sha256

  environment {
    variables = {
      EVIDENCE_S3_BUCKET = var.evidence_s3_bucket
      EVIDENCE_S3_PREFIX = var.evidence_s3_prefix
    }
  }
}

resource "aws_lambda_function" "summarize_privileged_activity" {
  function_name = "${var.project_name}-summarize-privileged-activity-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.summarize_privileged_activity_zip.output_path
  source_code_hash = data.archive_file.summarize_privileged_activity_zip.output_base64sha256

  environment {
    variables = {
      GC_OAUTH_SECRET_ARN  = var.gc_oauth_secret_arn
      GC_REGION             = var.gc_region
      GC_LOGIN_URL          = var.gc_login_url
      GC_SUMMARY_API_URL    = var.gc_summary_api_url
    }
  }
}

resource "aws_lambda_function" "generate_vendor_roster" {
  function_name = "${var.project_name}-generate-vendor-roster-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.generate_vendor_roster_zip.output_path
  source_code_hash = data.archive_file.generate_vendor_roster_zip.output_base64sha256

  environment {
    variables = {
      GC_OAUTH_SECRET_ARN  = var.gc_oauth_secret_arn
      GC_REGION             = var.gc_region
      GC_LOGIN_URL          = var.gc_login_url
      GC_BULK_EXPORT_BASE   = var.gc_bulk_export_base
      EVIDENCE_S3_BUCKET    = var.evidence_s3_bucket
      EVIDENCE_S3_PREFIX    = var.evidence_s3_prefix
    }
  }
}

resource "aws_lambda_function" "sumo_evidence_get" {
  function_name = "${var.project_name}-sumo-evidence-get-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.sumo_evidence_zip.output_path
  source_code_hash = data.archive_file.sumo_evidence_zip.output_base64sha256

  environment {
    variables = {
      BEDROCK_MODEL_ID     = var.bedrock_model_id
      SUMO_SECRET_ARN      = var.sumo_secret_arn
      SUMO_BASE_URL        = var.sumo_base_url
      SUMO_SOURCE_CATEGORY = var.sumo_source_category
    }
  }
}

resource "aws_lambda_function" "forge_query_the_augur" {
  function_name = "${var.project_name}-ForgeTool-QueryTheAugur-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.forge_augur_zip.output_path
  source_code_hash = data.archive_file.forge_augur_zip.output_base64sha256

  environment {
    variables = {
      BEDROCK_MODEL_ID     = var.bedrock_model_id
      SUMO_SECRET_ARN      = var.sumo_secret_arn
      SUMO_BASE_URL        = var.sumo_base_url
      SUMO_SOURCE_CATEGORY = var.sumo_source_category
    }
  }
}

resource "aws_lambda_function" "forge_vendor_ledger" {
  function_name = "${var.project_name}-ForgeTool-VendorLedger-${var.environment}"
  role          = aws_iam_role.lambda_with_secrets_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  filename      = data.archive_file.forge_vendorledger_zip.output_path
  source_code_hash = data.archive_file.forge_vendorledger_zip.output_base64sha256

  environment {
    variables = {
      GC_OAUTH_SECRET_ARN  = var.gc_oauth_secret_arn
      GC_REGION             = var.gc_region
      GC_LOGIN_URL          = var.gc_login_url
      GC_BULK_EXPORT_BASE   = var.gc_bulk_export_base
      EVIDENCE_S3_BUCKET    = var.evidence_s3_bucket
      EVIDENCE_S3_PREFIX    = var.evidence_s3_prefix
    }
  }
}

output "lambda_okta_admins_arn" { value = aws_lambda_function.okta_admins_get.arn }
output "lambda_s3_encryption_arn" { value = aws_lambda_function.aws_s3_encryption_get.arn }
output "lambda_jira_issue_arn" { value = aws_lambda_function.jira_issue_create.arn }
output "lambda_vendor_security_score_arn" { value = aws_lambda_function.vendor_security_score_get.arn }
output "lambda_offboarding_terminated_arn" { value = aws_lambda_function.offboarding_terminated_employees_get.arn }
output "lambda_check_user_access_arn" { value = aws_lambda_function.check_user_access.arn }
output "lambda_ir_evidence_log_arn" { value = aws_lambda_function.ir_evidence_log.arn }
output "lambda_firewall_rules_arn" { value = aws_lambda_function.firewall_rules_get.arn }
output "lambda_aws_iam_admins_arn" { value = aws_lambda_function.aws_iam_admins_get.arn }
output "lambda_aws_security_configs_arn" { value = aws_lambda_function.aws_security_configs_get.arn }
output "lambda_jira_change_tickets_arn" { value = aws_lambda_function.jira_change_tickets_get.arn }
output "lambda_active_employees_arn" { value = aws_lambda_function.active_employees_get.arn }
output "lambda_training_completions_arn" { value = aws_lambda_function.training_completions_get.arn }
output "lambda_genesys_cloud_admins_arn" { value = aws_lambda_function.genesys_cloud_admins_get.arn }
output "lambda_format_upload_evidence_arn" { value = aws_lambda_function.format_and_upload_evidence.arn }
output "lambda_summarize_privileged_activity_arn" { value = aws_lambda_function.summarize_privileged_activity.arn }
output "lambda_generate_vendor_roster_arn" { value = aws_lambda_function.generate_vendor_roster.arn }
output "lambda_sumo_evidence_arn" { value = aws_lambda_function.sumo_evidence_get.arn }
output "lambda_forge_query_the_augur_arn" { value = aws_lambda_function.forge_query_the_augur.arn }
output "lambda_forge_vendor_ledger_arn" { value = aws_lambda_function.forge_vendor_ledger.arn }

