variable "compliance_queue_name" {
  description = "Queue to route compliance review tasks"
  type        = string
  default     = "Compliance Review"
}

resource "genesyscloud_routing_queue" "compliance_review" {
  name        = "${var.compliance_queue_name}-${var.environment}"
  description = "Queue for compliance topic detection reviews"
}

# Analytics-Driven Trigger (Process Automation Trigger)
resource "genesyscloud_processautomation_trigger" "blueprint_compliance_siren" {
  name        = "Blueprint-ComplianceSiren-Trigger"
  topic_name  = "v2.speechandtextanalytics.conversation.{id}.topics"
  enabled     = true

  # Fire when topic name is GDPR Deletion Request or PCI Data Mentioned
  match_criteria = jsonencode({
    "jsonPath": "$.topic.name",
    "operator": "In",
    "values": ["GDPR Deletion Request", "PCI Data Mentioned"]
  })

  target {
    type = "workflow"
    id   = genesyscloud_architect_flow.blueprint_compliance_siren.id
  }
}

resource "genesyscloud_architect_flow" "blueprint_compliance_siren" {
  file_path = "${var.flows_path}/Blueprint-ComplianceSiren.flow.json"
}

