# ScoutOS Flagship Consolidation Architecture

ScoutOS is the flagship repository for Cody Weaver's GRC engineering portfolio. This branch begins consolidation of overlapping FedRAMP/GRC/evidence/remediation prototypes into a coherent monorepo structure.

## Imported modules

- `packages/pva-ksi-engine` from `KSI_Engine`
- `packages/scn-scout` from `SigChangeScout`
- `packages/remediation-engine` from `Praetorium_Nexus`
- `packages/argus-watch` from `Argus-Watch`
- `packages/attestation-service` from `-Fulcrum_Verify`
- `packages/threat-informed-grc` from `Vanguard_Agent`
- `integrations/tracecat-janus-forge` from `GC_GRC`

## Target architecture

```text
/apps/scoutos-hub
/apps/scoutos-assistant
/packages/evidence-schema
/packages/collectors
/packages/pva-ksi-engine
/packages/scn-scout
/packages/remediation-engine
/packages/attestation-service
/packages/threat-informed-grc
/integrations/tracecat-janus-forge
/infra/terraform
/docs/architecture
/docs/portfolio-case-studies
```

## Cleanup principle

Original repositories should remain available as archived source records until the imported modules are verified and any unique docs, CI, and deployment assets have been normalized into ScoutOS.
