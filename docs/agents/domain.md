# Domain docs

## Layout

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root.

## Files

### CONTEXT.md (repo root)

Contains:
- Project overview and purpose
- Key terminology and domain concepts
- Architecture decisions summary
- Links to important resources

Create this file when the project starts to take shape.

### docs/adr/

Architecture Decision Records. One file per decision:

```
docs/adr/
  0001-use-local-markdown-issues.md
  0002-some-other-decision.md
```

Use sequential numbering with descriptive kebab-case names.

## Consumer rules

- **Before starting work:** Read `CONTEXT.md` to understand the project
- **When making architectural decisions:** Create an ADR in `docs/adr/`
- **When unsure about terminology:** Check `CONTEXT.md` first
