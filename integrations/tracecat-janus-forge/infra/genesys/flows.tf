variable "flows_path" {
  description = "Path to flow JSON exports"
  type        = string
  default     = "${path.root}/../../flows"
}

locals {
  flow_defs = [
    { name = "Privileged Roster", file = "privileged_roster.flow.json" },
    { name = "Cloud Config Snapshot", file = "cloud_config_snapshot.flow.json" },
    { name = "Change Control Audit", file = "change_control_audit.flow.json" },
    { name = "Training Completion Audit", file = "training_completion_audit.flow.json" },
    { name = "GC Admin Audit", file = "gc_admin_audit.flow.json" },
    { name = "Sumo Audit Query", file = "sumo_audit_query.flow.json" },
    { name = "Blueprint-AugurQuery", file = "Blueprint-AugurQuery.flow.json" },
    { name = "Blueprint-ComplianceSiren", file = "Blueprint-ComplianceSiren.flow.json" }
  ]
}

# Placeholder flows gated by var.enable_flows
resource "genesyscloud_architect_flow" "grc_flows" {
  for_each = var.enable_flows ? { for f in local.flow_defs : f.name => f } : {}

  file_path = "${var.flows_path}/${each.value.file}"
}

