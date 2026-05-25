# policy_engine/risk_scoring.rego
package vanguard.risk_scoring

# Default to the input severity if no other rules match.
default refined_risk_score = input.severity

# --- Critical Risk Rule ---
# If severity is "High" AND the asset is tagged with "CUI" OR "FedRAMP_Critical",
# the refined_risk_score is "Critical".
refined_risk_score = "Critical" {
    input.severity == "High"
    critical_tags := {"CUI", "FedRAMP_Critical"}
    count({tag | tag := input.tags[_]; critical_tags[tag]}) > 0
}

# --- Mitigated Risk (Example) ---
# If a specific mitigation is in place, the risk can be downgraded.
# This is a placeholder for more complex GRC logic.
refined_risk_score = "Medium" {
    input.mitigated == true
    input.severity == "High"
}
