# Data Actions mapping to AWS Lambdas by ARN

locals {
  lambda_arn = function_name -> "arn:aws:lambda:${var.aws_region}:${var.aws_account_id}:function:${function_name}"
}

resource "genesyscloud_integration_action" "vendor_security_score_get" {
  name        = "vendor_security_score_get"
  category    = var.data_action_category
  secure      = true
  config_request {
    request_url      = local.lambda_arn("${var.project_name}-vendor-security-score-get-${var.environment}")
    request_type     = "json"
    request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"vendor-security-review","params":$${input.params}}
EOT
  }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}", "timingMs": $${timingMs}}
EOT }
}

resource "genesyscloud_integration_action" "offboarding_terminated_employees_get" {
  name        = "offboarding_terminated_employees_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-offboarding-terminated-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"offboarding-verify","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

resource "genesyscloud_integration_action" "check_user_access" {
  name        = "check_user_access"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-check-user-access-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"offboarding-verify","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

resource "genesyscloud_integration_action" "ir_evidence_log" {
  name        = "ir_evidence_log"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-ir-evidence-log-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"ir-test","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

resource "genesyscloud_integration_action" "policy_attestation_log" {
  name        = "policy_attestation_log"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-policy-attestation-log-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"policy-attest","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

resource "genesyscloud_integration_action" "firewall_rules_get" {
  name        = "firewall_rules_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-firewall-rules-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"fw-audit","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

resource "genesyscloud_integration_action" "aws_iam_admins_get" {
  name        = "aws_iam_admins_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-aws-iam-admins-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"privileged-roster","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}}
EOT }
}

resource "genesyscloud_integration_action" "aws_security_configs_get" {
  name        = "aws_security_configs_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-aws-security-configs-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"cloud-config-snapshot","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}}
EOT }
}

resource "genesyscloud_integration_action" "jira_change_tickets_get" {
  name        = "jira_change_tickets_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-jira-change-tickets-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"change-control","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}}
EOT }
}

resource "genesyscloud_integration_action" "active_employees_get" {
  name        = "active_employees_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-active-employees-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"training-audit","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}}
EOT }
}

resource "genesyscloud_integration_action" "training_completions_get" {
  name        = "training_completions_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-training-completions-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"training-audit","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}}
EOT }
}

resource "genesyscloud_integration_action" "genesys_cloud_admins_get" {
  name        = "genesys_cloud_admins_get"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-genesys-cloud-admins-get-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"gc-admin-audit","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}}
EOT }
}

resource "genesyscloud_integration_action" "format_and_upload_evidence" {
  name        = "format_and_upload_evidence"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-format-upload-evidence-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"evidence-upload","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}}
EOT }
}

resource "genesyscloud_integration_action" "summarize_privileged_activity" {
  name        = "summarize_privileged_activity"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-summarize-privileged-activity-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"privileged-activity-review","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

resource "genesyscloud_integration_action" "generate_vendor_roster" {
  name        = "ForgeTool-VendorLedger"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-ForgeTool-VendorLedger-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"vendor-roster","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

resource "genesyscloud_integration_action" "sumo_evidence_get" {
  name        = "ForgeTool-QueryTheAugur"
  category    = var.data_action_category
  secure      = true
  config_request { request_url = local.lambda_arn("${var.project_name}-ForgeTool-QueryTheAugur-${var.environment}"); request_type = "json"; request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"sumo-audit-query","params":$${input.params}}
EOT }
  config_response { success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}"}
EOT }
}

