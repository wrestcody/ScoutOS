## Summary

- Type: [Feature | Fix | Docs | Refactor | chore]
- Description:
- Linked issue(s): Closes #

## Checklist

- [ ] Naming conventions followed (`tools.janus.*`, `Blueprint-*`, `Ingot-*`)
- [ ] Lint passes (ruff check) and formatting verified (ruff format --check)
- [ ] Tests added/updated; `pytest` passes locally
- [ ] No secrets committed; uses Tracecat Secrets / AWS SSM / Secrets Manager
- [ ] UDFs use `@registry.register` + `RegistrySecret`, timeouts, clear JSON return
- [ ] YAML action templates define `inputs` and clean `output`; secrets from `SECRETS.*`
- [ ] Observability: emits `tools.janus.sumologic.log_event` where appropriate
- [ ] Docs updated if needed: `README.md`, `docs/hosting-aws-ecs.md`, `docs/secrets-matrix.md`, `docs/tracecat-ui-import-guide.md`, `docs/steering.md`
- [ ] Terraform/ECS examples updated if deployment behavior changed
- [ ] Security reviewed: least-privilege IAM for any AWS calls; no PII in logs
- [ ] Backward compatibility considered; version bump if required
- [ ] Manual test notes included (inputs, expected outputs)
- [ ] Screenshots/log samples attached (if applicable)

## Testing Notes

- Commands run:
```bash
ruff check . && ruff format --check .
pytest -q
```
- Manual validation steps:

## Breaking Changes

- [ ] None
- Details / migration steps:

