# Quick-config copy for `path`/`append` (deferred)

## Description

Decision (Q7): deferred — kept out of the spec-parity change set. The spec's `path` attribute
"enables visual prompt or quick config feature"; the filepath chip satisfies the visual prompt.
The reference's `buildEchoTee` turns the copy button into a `tee`/`tee -a` write command for the
configured file, with `append="true"` choosing `tee -a`. Until then `append` remains parsed and
passed through `HelpPageData` with no consumer.

## Status

- [ ] Decide copy UX: copy rendered content vs copy a `tee` write command (or both)
- [ ] Implement `tee`/`tee -a` command building per `path` + `append` (reference: `enhanced-codeblock/build-code.ts`)
- [ ] Then close: `append` has a consumer
