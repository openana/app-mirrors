# 06: Inline Templates

**What to build:** A `{ztmpl}` marker followed by a code span in prose is a Template: it renders through the same engine and variable context as fenced Templates — Global Inputs included — and `lang` syntax-highlights it. Ordinary braces in text (`awk '{print $1}'`, `${var}`) stay verbatim. The FreeBSD, gentoo, gentoo-zh.git, julia-releases and kodi pages stop leaking raw template text.

**Blocked by:** 01: Prefactor — test seams and runner, 05: Global Inputs

**Status:** ready-for-agent

- [ ] Marker-then-code-span renders as a Template with the shared variable context
- [ ] `lang` syntax-highlights inline output
- [ ] Non-template braces stay literal (regression with shell text containing braces)
- [ ] Regressions: FreeBSD cover list, gentoo `sync-uri` sentence, julia-releases `JULIAUP_SERVER`, kodi step text
- [ ] Fenced and inline Templates resolve variables identically (one shared render function)
