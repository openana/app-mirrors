# Plan: Faithful Port of mirrorz-help `parse-markdown.ts`

**Status: Complete**

## Context

The current `src/lib/help/parse-markdown.ts` uses regex-based markdown parsing (headings, bold, links, lists, blockquotes, `{ztmpl}` directives). This works for the subset of markdown features currently used in `zdoc/`, but breaks on:

- Nested lists, blockquotes containing code blocks, or any non-trivial CommonMark structure
- GFM tables (used in `rocky/`, `voidlinux/`, `centos-vault/`)
- Inline code inside headings (mangles slugs)
- Edge cases in `{ztmpl}` attribute parsing (quoted values with spaces, etc.)

The reference (`reference/mirrorz-help/src/lib/server/parse-markdown.ts`) uses a proper AST pipeline: `markdown-it` → `myst-parser` → MDAST transform → `@mdx-js/mdx` → eval JSX. We don't need the MDX/JSX half — we output HTML strings for `dangerouslySetInnerHTML` — but we do need the AST-based parsing and directive transformation half.

## Goal

Replace the regex-based parser with a proper AST pipeline that:

1. Parses markdown → MDAST using `markdown-it` + `myst-parser` (same as reference)
2. Transforms the MDAST: extract `{ztmpl}` directives into code blocks, extract headings with custom IDs
3. Converts MDAST → HTML via `rehype` (instead of reference's MDAST → MDX → JSX path)
4. Preserves the same output contract (`HelpPageData`) so `Help.tsx` and `CodeBlock.tsx` need no changes

## Architecture

```
zdoc/<page>/<block>.<lang>.md
        │
        ▼
  markdown-it + mystPlugin          ← tokenize (CommonMark + MyST directives)
        │
        ▼
  tokensToMyst (myst-parser)        ← tokens → MDAST
        │
        ▼
  unist-util-visit transform pass   ← extract ztmpl directives → codeBlocks[]
  │                                   extract headings → toc[]
  │                                   replace directives with <codeblock> placeholders
  │                                   validate unsupported directives/roles
        │
        ▼
  remark-rehype                     ← MDAST → HAST
        │
        ▼
  rehype-stringify                  ← HAST → HTML string
        │
        ▼
  { content: html, codeBlocks, toc, compiledTemplates, meta }
```

Key difference from reference: we stop at HTML string instead of continuing through `@mdx-js/mdx` → `@swc` → eval → React tree → JSON serialization. This is correct for a Vite SPA that renders via `dangerouslySetInnerHTML`.

## Dependencies to Add

```bash
npm install markdown-it markdown-it-myst myst-parser unified remark-rehype rehype-stringify unist-util-visit mdast-util-to-string github-slugger vfile
npm install -D @types/markdown-it @types/mdast
```

| Package | Purpose |
|---|---|
| `markdown-it` | CommonMark tokenizer (with table support) |
| `markdown-it-myst` | MyST directive/role parsing for markdown-it |
| `myst-parser` | `tokensToMyst` — converts markdown-it tokens to MDAST |
| `unified` | Pipeline orchestrator for remark-rehype |
| `remark-rehype` | MDAST → HAST conversion |
| `rehype-stringify` | HAST → HTML string |
| `unist-util-visit` | AST visitor for the transform pass |
| `mdast-util-to-string` | Extract plain text from MDAST nodes (for heading slugs) |
| `github-slugger` | Generate deterministic slugs for heading IDs |
| `vfile` | Virtual file for myst-parser (required by API) |

**NOT needed** (reference uses these for the MDX/JSX path we skip):

- `@mdx-js/mdx` — we output HTML, not compiled JSX
- `@swc/core` — no JSX → CommonJS transform
- `metro-cache` — no disk caching (add later if perf is an issue)
- `mdast-util-to-markdown` / `mdast-util-gfm-table` / `mdast-util-mdx` — MDAST → markdown serialization (we go to HTML)
- `rehype-external-links` — can add later if needed
- `remark-unwrap-images` — can add later if needed

## Files to Change

### 1. `src/lib/help/parse-markdown.ts` — full rewrite

Replace the `parseContentBlocks` function and its regex-based approach with the AST pipeline.

**Keep unchanged:**
- `loadFile`, `loadConf`, `loadBlock` — config/file loading logic (already faithful)
- `transpileInput`, `createInitialState` — input/menu transpilation (already faithful)
- `getContentBySegments`, `getAvailableSegments` — top-level orchestration (already faithful)
- Type imports from `./types`

**Replace:**
- `parseContentBlocks()` — the core function. Currently regex-based, needs full rewrite.

**New internal function: `parseContentAst()`**

```typescript
function parseContentAst(
  content: string,
  blockPath: string | null,
  inputDefs: Record<string, ZDocInput>,
  globalBlockCounter: { value: number },
): {
  html: string;
  codeBlocks: Array<{
    id: string;
    template: string;
    menus: InputType[];
    lang?: string;
    filepath?: string;
  }>;
  headings: ToC[];
}
```

Steps inside:
1. Create `MarkdownIt('commonmark').enable('table')` + `mystPlugin`
2. Tokenize: `tokenizer.parse(content, { vfile: new VFile(blockPath ? { path: blockPath } : null) })`
3. Convert to MDAST: `tokensToMyst(tokens)`
4. Visit MDAST, transform `mystDirective` nodes:
   - Name must be `ztmpl`; anything else → throw with location info
   - Extract `input`, `lang`, `path` from directive options
   - Build menus via `transpileInputToMenuValue()` (port from reference)
   - Push to `codeBlocks[]`
   - Replace node with an `html` node: `<codeblock id="..." />`
5. Visit `mystRole` nodes (inline `{ztmpl}`):
   - Same extraction, but for inline code templates
   - Replace with inline `html` node
6. Visit `heading` nodes:
   - Check last child for `{#custom-id}` suffix
   - If present, strip from text, use as ID
   - If absent, generate slug via `github-slugger`
   - Push to `headings[]`
   - Set `data.hProperties.id` on the heading node
7. Validate: throw on `mystDirectiveError` / `mystRoleError`
8. Convert MDAST → HAST via `remarkRehype`
9. Convert HAST → HTML via `rehypeStringify`

**Port from reference: `transpileInputToMenuValue()`**

This function parses the `input="name1 name2"` directive option into `InputType[]`. Currently inlined in the regex approach; needs to be a proper function that validates input names exist in the config.

**Port from reference: error handling**

The reference throws on:
- Unsupported directive names (not `ztmpl`)
- Directive/role parse errors
- Missing input definitions
- Invalid header custom IDs (not valid slugs)

These should be preserved.

### 2. `src/lib/help/types.ts` — minor additions

Add if needed for any new type exports. Currently sufficient.

### 3. `package.json` — dependency additions

Add the 10 runtime + 2 dev dependencies listed above.

### 4. No changes needed to:

- `src/pages/Help.tsx` — consumes `HelpPageData` interface, unchanged
- `src/components/help/CodeBlock.tsx` — consumes `compiledTemplates` + `codeBlocks`, unchanged
- `scripts/build-help.ts` — calls `getContentBySegments`, unchanged

## Features the Reference Has That We Should Port

| Feature | Priority | Notes |
|---|---|---|
| Proper CommonMark parsing | **Must** | The whole point |
| MyST `{ztmpl}` directive handling | **Must** | The whole point |
| MyST `{ztmpl}` role (inline) handling | **Must** | Inline code templates |
| Heading custom IDs `{#slug}` | **Must** | Used in zdoc |
| GFM tables | **Must** | Used in rocky, voidlinux, etc. |
| Error on unsupported directives | **Must** | Catch authoring mistakes |
| `global` directive option | Should | Not currently used in zdoc, but port for parity |
| `append` directive option | Should | Not currently used in zdoc, but port for parity |
| `MirrorBlock`/`MirrorVariant` site system | Skip | Local project handles this differently (runtime variables) |
| MDX compilation → React JSX | Skip | We output HTML |
| Disk caching (metro-cache) | Skip | Premature optimization; add later if needed |
| `rehype-external-links` | Skip | Can add later |
| `remark-unwrap-images` | Skip | Can add later |
| Hogan compile at build time | Could | Reference compiles at build; local compiles client-side. Both work. |

## Migration Steps

1. **Install dependencies** — add the 10 packages to `package.json`
2. **Write `parseContentAst()`** — the new AST-based core, test against a few zdoc pages
3. **Port `transpileInputToMenuValue()`** — from reference, with validation
4. **Update `getContentBySegments()`** — swap `parseContentBlocks` → `parseContentAst`
5. **Remove old regex code** — delete `parseContentBlocks` and its regex helpers
6. **Test** — run `npm run build:help` and verify output JSON matches (or improves)
7. **Compare output** — diff a few generated `.json` files against the old output

## Risks

- **myst-parser / markdown-it-myst version compatibility** — these are somewhat niche packages. Pin versions and test.
- **HTML output differences** — the AST pipeline will produce slightly different HTML than regex (e.g., `<p>` wrapping, `<br>` vs `\n`). The frontend must handle both. Since it uses `dangerouslySetInnerHTML`, this should be fine.
- **Performance** — the AST pipeline is slower than regex. For ~100 zdoc pages at build time, this is negligible.