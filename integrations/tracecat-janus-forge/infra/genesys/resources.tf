# Stubs for Genesys Cloud resources. Replace placeholders with real configs as flows and actions are finalized.

variable "data_action_category" {
  description = "Data Action category name"
  type        = string
  default     = "GRC-Micro-Connectors"
}

# Example Data Action stub (define one per Lambda)
resource "genesyscloud_integration_action" "okta_admins_get" {
  name        = "okta_admins_get"
  category    = var.data_action_category
  secure      = true
  config_request {
    request_url      = "aws:lambda:${var.aws_region}:${var.aws_account_id}:function:${var.project_name}-okta-admins-get-${var.environment}"
    request_type     = "json"
    request_template = <<EOT
{"correlationId":"$${input.correlationId}","controlId":"okta-admins","params":$${input.params}}
EOT
  }
  config_response {
    success_template = <<EOT
{"status": "$${status}", "items": $${evidence.items}, "errorCode": "$${error.code}", "errorMessage": "$${error.message}", "timingMs": $${timingMs}}
EOT
  }
}

# Add more actions for each Lambda as needed following the same pattern

# Queue stub
resource "genesyscloud_routing_queue" "grc_exceptions" {
  name               = "${var.grc_queue_name}-${var.environment}"
  description        = "GRC exceptions and manual reviews"
  wrapup_codes       = []
  acw_wrapup_prompt  = "MANDATORY_TIMEOUT"
}

# Data Table stubs
resource "genesyscloud_datatable" "grc_results" {
  name        = "GRC_RESULTS_${var.environment}"
  description = "Compact results for GRC control runs"
  properties  = [
    {
      name = "correlationId"
      type = "string"
    },
    {
      name = "controlId"
      type = "string"
    },
    {
      name = "status"
      type = "string"
    },
    {
      name = "timestamp"
      type = "string"
    }
  ]
}

# Golden record Data Tables (examples)
resource "genesyscloud_datatable" "ingot_approved_admins" {
  name        = "Ingot-ApprovedAdmins-${var.environment}"
  description = "Ingot of approved admin emails"
  properties  = [
    { name = "approvedItems", type = "json" }
  ]
}

resource "genesyscloud_datatable" "golden_s3_encryption" {
  name        = "${var.golden_table_prefix}s3_encryption_${var.environment}"
  description = "Required S3 encryption parameters"
  properties  = [
    { name = "kmsKeyId", type = "string" },
    { name = "bucketPattern", type = "string" }
  ]
}

# Seed example rows
resource "genesyscloud_datatable_row" "ingot_approved_admins_row" {
  datatable_id = genesyscloud_datatable.ingot_approved_admins.id
  key_value    = "default"
  properties   = jsonencode({ approvedItems = ["admin1@acme.com", "admin2@acme.com"] })
}

resource "genesyscloud_datatable_row" "golden_s3_encryption_row" {
  datatable_id = genesyscloud_datatable.golden_s3_encryption.id
  key_value    = "default"
  properties   = jsonencode({ kmsKeyId = "arn:aws:kms:us-east-1:123456789012:key/abcd-efgh", bucketPattern = "^acme-(prod|dev)-.*$" })
}

