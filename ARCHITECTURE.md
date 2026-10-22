# Architecture

`contracts` is a build-time pipeline. Sources are validated, bundled into one schema graph keyed by schema
title, then rendered by one renderer per target. Domain code (bundling, naming, constant model, renderers) is
pure; filesystem, Ajv, Redocly, typify and `mix format` sit behind ports in `infrastructure/`.

```mermaid
C4Component
  title Component diagram: codegen
  Container_Boundary(codegen, "codegen") {
    Component(cli, "interface/cli", "TypeScript", "validate and codegen commands")
    Component(app, "application", "TypeScript", "load-contracts, validate-contracts, generate-artifacts, ports")
    Component(domain, "domain", "TypeScript", "schema-bundle, openapi-bundle, constant-groups, consistency, renderers")
    Component(infra, "infrastructure", "TypeScript", "Ajv, Redocly, json-schema-to-typescript, openapi-typescript, typify, file adapter")
  }
  System_Ext(src, "Sources", "openapi/, schemas/, registries, fixtures/")
  System_Ext(out, "Generated", "packages/ts, packages/rust, packages/elixir, dist/, reference/")
  Rel(cli, app, "runs")
  Rel(app, domain, "uses")
  Rel(app, infra, "through ports")
  Rel(infra, src, "reads")
  Rel(infra, out, "writes")
```

## Rules

- `codegen` validates first and refuses to generate from invalid sources.
- Generated directories are replaced wholesale on each run, so stale files cannot linger.
- CI regenerates and fails on any git diff, which keeps committed artifacts in sync with the sources.
- Each schema has a unique `title`; that title is the type name in every language.
