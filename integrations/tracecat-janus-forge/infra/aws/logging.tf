resource "aws_cloudwatch_log_group" "lambda_okta" {
  name              = "/aws/lambda/${aws_lambda_function.okta_admins_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_s3" {
  name              = "/aws/lambda/${aws_lambda_function.aws_s3_encryption_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_jira" {
  name              = "/aws/lambda/${aws_lambda_function.jira_issue_create.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_vendor_score" {
  name              = "/aws/lambda/${aws_lambda_function.vendor_security_score_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_offboarding_terminated" {
  name              = "/aws/lambda/${aws_lambda_function.offboarding_terminated_employees_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_check_user_access" {
  name              = "/aws/lambda/${aws_lambda_function.check_user_access.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_ir_evidence_log" {
  name              = "/aws/lambda/${aws_lambda_function.ir_evidence_log.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_firewall_rules" {
  name              = "/aws/lambda/${aws_lambda_function.firewall_rules_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_aws_iam_admins" {
  name              = "/aws/lambda/${aws_lambda_function.aws_iam_admins_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_aws_security_configs" {
  name              = "/aws/lambda/${aws_lambda_function.aws_security_configs_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_jira_change_tickets" {
  name              = "/aws/lambda/${aws_lambda_function.jira_change_tickets_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_active_employees" {
  name              = "/aws/lambda/${aws_lambda_function.active_employees_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_training_completions" {
  name              = "/aws/lambda/${aws_lambda_function.training_completions_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_genesys_cloud_admins" {
  name              = "/aws/lambda/${aws_lambda_function.genesys_cloud_admins_get.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_format_upload_evidence" {
  name              = "/aws/lambda/${aws_lambda_function.format_and_upload_evidence.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_summarize_privileged_activity" {
  name              = "/aws/lambda/${aws_lambda_function.summarize_privileged_activity.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_generate_vendor_roster" {
  name              = "/aws/lambda/${aws_lambda_function.generate_vendor_roster.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_sumo_evidence_get" {
  name              = "/aws/lambda/${aws_lambda_function.sumo_evidence_get.function_name}"
  retention_in_days = var.log_retention_days
}

