# 07: Parser strictness

**What to build:** The parser fails the build with located errors (page, block, line — in the existing error-message style) for anything in the Template syntax it doesn't honour: unknown Template attributes, `global` without `input`, `default` outside the option set, and `append` without a file path. Input typings accept non-string option values (e.g. a boolean `sid` flag). Existing strict errors are unchanged and the whole Base Docs corpus still parses.

**Blocked by:** 05: Global Inputs, 06: Inline Templates

**Status:** done (archived)

- [x] Unknown Template attribute → located error (fenced and inline alike)
- [x] `global` without `input` → located error
- [x] `default` not among the options → located error
- [x] `append` without a file path → located error
- [x] Non-string option values type-check and render
- [x] Existing errors (unsupported directive, undefined input) unchanged
- [x] The entire Base Docs corpus parses with no false positives
