AWS-Free Demo Guide: The Janus Forge

Goal
Demonstrate The Janus Forge orchestration and analyst experience using ONLY native Genesys Cloud: mocked Data Actions, Blueprints, Ingots, and The Hearth.

What you will import/configure
- Ingots: `Ingot-ApprovedAdmins` (Data Table with `approvedItems` row)
- Mocked Data Actions (Web Services):
  - `ForgeTool-GetOktaAdmins (Mock)`
  - `ForgeTool-UploadEvidence (Mock)`
  - `ForgeTool-QueryTheAugur (Mock)`
- Blueprints (Architect):
  - `Blueprint-PrivilegedRoster` (points to mocked Forge Tools)
  - `Blueprint-AugurQuery` (points to mocked Forge Tool)
- The Hearth Script:
  - `The Hearth - Audit Request` (button runs `Blueprint-AugurQuery`)

Steps
1) Create `Ingot-ApprovedAdmins` Data Table
   - Property: `approvedItems` (json)
   - Seed row key `default` with an array of approved emails

2) Create mocked Data Actions
   - Web Services Data Action -> Import JSON
     - `mocks/data-actions/ForgeTool-GetOktaAdmins.mock.json`
     - `mocks/data-actions/ForgeTool-UploadEvidence.mock.json`
     - `mocks/data-actions/ForgeTool-QueryTheAugur.mock.json`

3) Import Blueprints (or use placeholders)
   - Ensure Blueprint-PrivilegedRoster calls `ForgeTool-GetOktaAdmins (Mock)` and `ForgeTool-UploadEvidence (Mock)`
   - Ensure Blueprint-AugurQuery calls `ForgeTool-QueryTheAugur (Mock)`

4) Import The Hearth Script
   - Scripts -> Import `mocks/scripts/The-Hearth-AuditRequest.script.json`
   - Verify button starts `Blueprint-AugurQuery` with `${audit_request}` input

5) Run the demos
   - The Sentinel: Manually run `Blueprint-PrivilegedRoster` in Architect; observe drift (`rogue.admin@example.com`), task creation, and “uploaded” evidence path
   - The Augur: Open The Hearth, type a request, click Generate Evidence; see static results grid

Security & determinism
- No secrets involved; static responses ensure predictable demo behavior
- Keep mocked actions labeled clearly to avoid production confusion

