package witness.iam.password_policy

import future.keywords.if

default allow = false

allow if {
    input.predicate.evidence_payload.password_policy.minimum_password_length >= 14
}
