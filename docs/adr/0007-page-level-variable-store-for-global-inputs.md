# Page-level variable store for Global Inputs

Every Template (fenced code block or inline) renders with the same variable context: the block's own input variables, then Global Input variables from a page-level store, then the built-ins (`scheme`, `host`, `path`, `endpoint`, `sudo`), which always win. Global Input forms render inline where their `global="true"` block sits in the document, and `HelpPageData` carries them as a separate `globalForms` array with `<globalmenu id>` placeholders rather than overloading `codeBlocks`. We mirror mirrorz-help's architecture because zdoc content is authored and tested against it, so an identical variable resolution order prevents subtle rendering drift between the two consumers.

## Considered Options

- **Duplicate each Global Input onto every code block's menu** — rejected: selections would not be shared across blocks (`erlang-solutions` has four Global Inputs used by blocks throughout the page).
- **A sticky "global settings" panel** — rejected: the spec places the form "here" in the document flow; pages with several Global Inputs would lose the relationship between each form and the sections that use it.
- **Overload `codeBlocks` with a `kind` discriminator** — rejected: churns every consumer of the contract where a parallel array keeps existing shapes intact.

## Consequences

- `HelpPageData` gains `globalForms: Array<{ id, menus }>` and the content HTML gains `<globalmenu id>` placeholders.
- Template rendering needs a page-level context for the store; `CodeBlock` merges it at render time instead of owning all variables.
- Variable precedence (block < global < built-ins) is now a contract of this pipeline and must stay aligned with mirrorz-help.
