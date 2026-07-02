# Skill Registry — ServicioLocalSTS

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

Last updated: 2026-07-01

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Creating a pull request, opening a PR | branch-pr | `C:\Users\jhan4\.config\opencode\skills\branch-pr\SKILL.md` |
| Editing opencode's own configuration | customize-opencode | `C:\Users\jhan4\.config\opencode\skills\customize-opencode\SKILL.md` (built-in) |
| Writing Go tests, teatest, test coverage | go-testing | `C:\Users\jhan4\.config\opencode\skills\go-testing\SKILL.md` |
| Creating a GitHub issue, reporting a bug | issue-creation | `C:\Users\jhan4\.config\opencode\skills\issue-creation\SKILL.md` |
| judgment day, dual review, juzgar | judgment-day | `C:\Users\jhan4\.config\opencode\skills\judgment-day\SKILL.md` |
| perplexity, pplx, pwm, web search | perplexity-web-mcp | `C:\Users\jhan4\.config\opencode\skills\perplexity-web-mcp\SKILL.md` |
| Creating a new skill | skill-creator | `C:\Users\jhan4\.config\opencode\skills\skill-creator\SKILL.md` |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue with `status:approved` label — no exceptions
- Branch names MUST match `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- PR body MUST contain: linked issue (Closes/Fixes/Resolves #N), exactly one `type:*` label, summary, changes table, test plan, contributor checklist
- Commit messages MUST match conventional commit regex `^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9\._-]+\))?!?: .+`
- Run `shellcheck scripts/*.sh` before pushing; automated checks must pass before merge
- No `Co-Authored-By` trailers in commit messages

### customize-opencode
- Use when editing opencode's own config: opencode.json, .opencode/, files under ~/.config/opencode/
- Do NOT use for user's application code — only for opencode infrastructure itself
- Applies to agents, subagents, skills, plugins, MCP servers, and permission rules

### go-testing
- Prefer table-driven tests with `[]struct{name, input, expected, wantErr}` pattern
- Test Bubbletea models by sending `tea.KeyMsg` directly to `Model.Update()` — no teatest needed for unit tests
- Use `teatest.NewTestModel()` for full TUI integration flows, `tm.WaitFinished()` for async completion
- Golden file testing: write to `testdata/`, compare `View()` output, use `-update` flag to refresh
- Mock `os/exec` via interfaces; use `t.TempDir()` for temp files in tests
- Organize: `model_test.go`, `update_test.go`, `view_test.go`, `testdata/` directory

### issue-creation
- Use template (bug_report.yml or feature_request.yml) — blank issues are disabled
- Pre-flight: search duplicates, understand approval workflow before creating
- Bug report requires: description, steps to reproduce, expected vs actual behavior, OS, agent, shell
- Feature request requires: problem description, proposed solution, affected area
- Issues auto-get `status:needs-review` on creation; maintainer adds `status:approved` before PR
- Questions go to Discussions, not issues

### judgment-day
- Launch TWO parallel blind judge sub-agents (never sequential, never self-review)
- Resolve skill registry before launching judges — inject matching compact rules as `## Project Standards (auto-resolved)`
- Severity: CRITICAL > WARNING (real) > WARNING (theoretical) > SUGGESTION
- Theoretical warnings are reported as INFO, NOT fixed, do NOT trigger re-judgment
- After Round 1: present verdict to user and ASK before fixing
- After 2 fix iterations, ASK user before continuing; never escalate automatically
- Fix Agent is a SEPARATE delegation — never use a judge as fixer
- Must reach terminal state (APPROVED or ESCALATED) before any git push/commit/session summary

### perplexity-web-mcp
- Check quota FIRST every session via `pplx_usage()` or `pwm usage`
- Default to `intent='quick'` (Sonar 2) — only escalate when query genuinely needs Pro
- Never use Deep Research autonomously — only when user explicitly asks
- Model Council (pplx_council): ASK user which models first; each = 1 Pro Search; exclude Max-only models (gpt55, claude_opus) on Pro subscription
- Auth tokens last ~30 days; re-auth on 403 errors via `pwm login`
- Multi-turn conversations: pass `conversation_id` from previous response to maintain context
- Source focus: `none` (model only), `web`, `academic`, `social`, `finance`, `all`

### skill-creator
- Create skill when pattern is reusable, project-specific, or a complex workflow — NOT for one-off tasks or trivial patterns
- Structure: `skills/{name}/SKILL.md` + optional `assets/` + optional `references/`
- Frontmatter: name, description (includes Trigger: keywords), license (Apache-2.0), metadata.author, metadata.version
- SKILL.md sections: When to Use, Critical Patterns, Code Examples, Commands, Resources
- `assets/` for templates/schemas; `references/` for local docs (no web URLs)
- After creating, register in AGENTS.md under Skills table

## Project Conventions

No project-level convention files found (no AGENTS.md, CLAUDE.md, .cursorrules, GEMINI.md, or copilot-instructions.md at project root).

Convention index: `C:\Users\jhan4\.config\opencode\AGENTS.md` (user-level — applies to all opencode sessions).

## Project Context (from SDD Init)

- **SDD Persistence**: hybrid (openspec + engram)
- **Strict TDD Mode**: disabled (no test runner detected)
- **Stack**: Vite + React 18 SPA + shadcn/ui (frontend), Fastify + TypeScript (backend), Supabase PostgreSQL
- **Deployment**: Vercel (Vite framework)
- **Conventions**: Conventional commits, TypeScript strict mode, ES Modules
- **Testing**: No test infrastructure installed; typecheck-only (tsc --noEmit)
- **Quality**: No ESLint, Prettier, or formatter configured
- **Re-initialized**: 2026-07-01
- **Engram context ID**: obs-80c946f6d3af1ee3 (topic: sdd-init/serviciolocalsts)
- **Engram testing-capabilities ID**: obs-9f8ec34ad556c34c (topic: sdd/serviciolocalsts/testing-capabilities)
