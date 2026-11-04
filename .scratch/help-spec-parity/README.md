# Help spec parity

Bring `src/lib/help/` in line with the mirrorz-docs spec (`zdoc/README.md`), plus two adjacent decisions.

## Settled decisions (grilling rounds 1–2)

- Global Inputs: inline form at the directive position, page-level variable store merged into every Template render; precedence block < global < built-ins (ADR 0007).
- Inline `{ztmpl}` Templates: only the exact marker-then-code-span pattern; shared variable context; `lang` enables Prism.
- `filter.scheme`: force `scheme`/`endpoint` and disable the HTTPS toggle on the page with an i18n hint.
- `path = /<cname>`, `endpoint = <scheme>://<host><path>`, one source of truth.
- Parser strictness: unknown ztmpl attrs, `global` without `input`, `default` not in `option`, `append` without `path` all throw with page/block/line info; `global` block content is ignored silently (spec says so).
- `append`/quick-config is deferred; the field stays passthrough.
- Storage: submodule at `zdoc/global/` (Base Docs), overrides at `zdoc/local/` (Site Overrides); local-only pages allowed.
- `mirror-sites.ts` field `endpoint` renamed to `host`; `{{endpoint}}` documented as Mirror Endpoint URL.
- `/git/` URL prefix removed everywhere; Git Mirrors use `/{cname}/` like all mirrors.

## Spec

Full specification: [`spec.md`](./spec.md) — label `ready-for-agent`.

## Tickets

All nine tickets are **done and archived** under [`closed/`](./closed/) — implemented on the
`integration/help-spec-parity` branch (each ticket merged as its own integration commit; a
post-implementation code review landed as `fix/code-review-findings`). The [`issues/`](./issues/)
directory is empty.

| Ticket | Blocked by | Closed |
|---|---|---|
| [`01` Prefactor — test seams and runner](./closed/01-prefactor-test-seams.md) | — | ✓ |
| [`02` Rename the site-config `endpoint` field to `host`](./closed/02-rename-endpoint-to-host.md) | 01 | ✓ |
| [`03` Base Docs and Site Overrides storage layout](./closed/03-base-docs-site-overrides-layout.md) | 01 | ✓ |
| [`04` URL Template Variables](./closed/04-url-template-variables.md) | 01, 02 | ✓ |
| [`05` Global Inputs](./closed/05-global-inputs.md) | 01 | ✓ |
| [`06` Inline Templates](./closed/06-inline-templates.md) | 01, 05 | ✓ |
| [`07` Parser strictness](./closed/07-parser-strictness.md) | 05, 06 | ✓ |
| [`08` `filter.scheme` enforcement](./closed/08-filter-scheme-enforcement.md) | 04 | ✓ |
| [`09` Git Mirror URLs](./closed/09-git-mirror-urls.md) | 01 | ✓ |

The earlier flat plan files were superseded by these tickets and removed;
[`quick-config-append.md`](./quick-config-append.md) remains parked as a deferred, non-ticket item
(out of spec scope).
