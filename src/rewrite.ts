/** Env-var prefix pattern: \`FOO=bar BAZ=qux \` */
const ENV_PREFIX_RE = /^([A-Za-z_][A-Za-z0-9_]*=[^ ]* +)+/

/**
 * Command rewrite rules. Each entry maps a regex pattern (matched against the
 * first command in a pipeline) to a function that rewrites the full command
 * string through RTK.
 *
 * The order matters — first match wins.
 */
const RULES: [RegExp, (cmd: string) => string][] = [
  // --- Git ---
  [/^git\s+status(\s|$)/, (c) => c.replace(/^git status/, "rtk git status")],
  [/^git\s+diff(\s|$)/, (c) => c.replace(/^git diff/, "rtk git diff")],
  [/^git\s+log(\s|$)/, (c) => c.replace(/^git log/, "rtk git log")],
  [/^git\s+add(\s|$)/, (c) => c.replace(/^git add/, "rtk git add")],
  [/^git\s+commit(\s|$)/, (c) => c.replace(/^git commit/, "rtk git commit")],
  [/^git\s+push(\s|$)/, (c) => c.replace(/^git push/, "rtk git push")],
  [/^git\s+pull(\s|$)/, (c) => c.replace(/^git pull/, "rtk git pull")],
  [/^git\s+branch(\s|$)/, (c) => c.replace(/^git branch/, "rtk git branch")],
  [/^git\s+fetch(\s|$)/, (c) => c.replace(/^git fetch/, "rtk git fetch")],
  [/^git\s+stash(\s|$)/, (c) => c.replace(/^git stash/, "rtk git stash")],
  [/^git\s+show(\s|$)/, (c) => c.replace(/^git show/, "rtk git show")],

  // --- GitHub CLI ---
  [/^gh\s+(pr|issue|run|api|release)(\s|$)/, (c) => c.replace(/^gh /, "rtk gh ")],

  // --- Cargo (Rust) ---
  [/^cargo\s+test(\s|$)/, (c) => c.replace(/^cargo test/, "rtk cargo test")],
  [/^cargo\s+build(\s|$)/, (c) => c.replace(/^cargo build/, "rtk cargo build")],
  [/^cargo\s+clippy(\s|$)/, (c) => c.replace(/^cargo clippy/, "rtk cargo clippy")],
  [/^cargo\s+check(\s|$)/, (c) => c.replace(/^cargo check/, "rtk cargo check")],
  [/^cargo\s+install(\s|$)/, (c) => c.replace(/^cargo install/, "rtk cargo install")],
  [/^cargo\s+fmt(\s|$)/, (c) => c.replace(/^cargo fmt/, "rtk cargo fmt")],

  // --- File operations ---
  [/^cat\s+/, (c) => c.replace(/^cat /, "rtk read ")],
  [/^(rg|grep)\s+/, (c) => c.replace(/^(rg|grep) /, "rtk grep ")],
  [/^ls(\s|$)/, (c) => c.replace(/^ls/, "rtk ls")],
  [/^tree(\s|$)/, (c) => c.replace(/^tree/, "rtk tree")],
  [/^find\s+/, (c) => c.replace(/^find /, "rtk find ")],
  [/^diff\s+/, (c) => c.replace(/^diff /, "rtk diff ")],

  // --- JS/TS tooling ---
  [/^(pnpm\s+)?(npx\s+)?vitest(\s|$)/, (c) => c.replace(/^(pnpm )?(npx )?vitest( run)?/, "rtk vitest run")],
  [/^pnpm\s+test(\s|$)/, (c) => c.replace(/^pnpm test/, "rtk vitest run")],
  [/^npm\s+test(\s|$)/, (c) => c.replace(/^npm test/, "rtk npm test")],
  [/^npm\s+run\s+/, (c) => c.replace(/^npm run /, "rtk npm ")],
  [/^(npx\s+)?vue-tsc(\s|$)/, (c) => c.replace(/^(npx )?vue-tsc/, "rtk tsc")],
  [/^pnpm\s+tsc(\s|$)/, (c) => c.replace(/^pnpm tsc/, "rtk tsc")],
  [/^(npx\s+)?tsc(\s|$)/, (c) => c.replace(/^(npx )?tsc/, "rtk tsc")],
  [/^pnpm\s+lint(\s|$)/, (c) => c.replace(/^pnpm lint/, "rtk lint")],
  [/^(npx\s+)?eslint(\s|$)/, (c) => c.replace(/^(npx )?eslint/, "rtk lint")],
  [/^(npx\s+)?prettier(\s|$)/, (c) => c.replace(/^(npx )?prettier/, "rtk prettier")],
  [/^(npx\s+)?playwright(\s|$)/, (c) => c.replace(/^(npx )?playwright/, "rtk playwright")],
  [/^pnpm\s+playwright(\s|$)/, (c) => c.replace(/^pnpm playwright/, "rtk playwright")],
  [/^(npx\s+)?prisma(\s|$)/, (c) => c.replace(/^(npx )?prisma/, "rtk prisma")],

  // --- Containers ---
  [/^docker\s+compose(\s|$)/, (c) => c.replace(/^docker /, "rtk docker ")],
  [/^docker\s+(ps|images|logs|run|build|exec)(\s|$)/, (c) => c.replace(/^docker /, "rtk docker ")],
  [/^kubectl\s+(get|logs|describe|apply)(\s|$)/, (c) => c.replace(/^kubectl /, "rtk kubectl ")],

  // --- Network ---
  [/^curl\s+/, (c) => c.replace(/^curl /, "rtk curl ")],
  [/^wget\s+/, (c) => c.replace(/^wget /, "rtk wget ")],

  // --- pnpm package management ---
  [/^pnpm\s+(list|ls|outdated)(\s|$)/, (c) => c.replace(/^pnpm /, "rtk pnpm ")],

  // --- Python ---
  [/^pytest(\s|$)/, (c) => c.replace(/^pytest/, "rtk pytest")],
  [/^python\s+-m\s+pytest(\s|$)/, (c) => c.replace(/^python -m pytest/, "rtk pytest")],
  [/^ruff\s+(check|format)(\s|$)/, (c) => c.replace(/^ruff /, "rtk ruff ")],
  [/^pip\s+(list|outdated|install|show)(\s|$)/, (c) => c.replace(/^pip /, "rtk pip ")],
  [/^uv\s+pip\s+(list|outdated|install|show)(\s|$)/, (c) => c.replace(/^uv pip /, "rtk pip ")],

  // --- Go ---
  [/^go\s+test(\s|$)/, (c) => c.replace(/^go test/, "rtk go test")],
  [/^go\s+build(\s|$)/, (c) => c.replace(/^go build/, "rtk go build")],
  [/^go\s+vet(\s|$)/, (c) => c.replace(/^go vet/, "rtk go vet")],
  [/^golangci-lint(\s|$)/, (c) => c.replace(/^golangci-lint/, "rtk golangci-lint")],
  // --- Elixir / Phoenix / Ash ---
  [/^mix\s+phx\.routes(\s|$)/, (c) => c.replace(/^mix phx\.routes/, "rtk --cache mix phx.routes")],
  [/^mix\s+ash\.info(\s|$)/, (c) => c.replace(/^mix ash\.info/, "rtk --cache mix ash.info")],
  [/^mix\s+test(\s|$)/, (c) => c.replace(/^mix test/, "rtk test mix test")],
  [/^mix\s+credo(\s|$)/, (c) => c.replace(/^mix credo/, "rtk lint mix credo")],
  [/^mix\s+format(\s|$)/, (c) => c.replace(/^mix format/, "rtk format mix format")],
  [/^mix\s+dialyzer(\s|$)/, (c) => c.replace(/^mix dialyzer/, "rtk err mix dialyzer")],
  [/^mix\s+compile(\s|$)/, (c) => c.replace(/^mix compile/, "rtk mix compile")],
  [/^mix\s+ecto\.(migrate|migrations)(\s|$)/, (c) => c.replace(/^mix ecto\.(migrate|migrations)/, "rtk mix ecto.\$1")],
  [/^mix\s+help(\s|$)/, (c) => c.replace(/^mix help/, "rtk --cache mix help")],
  [/^mix\s+/, (c) => c.replace(/^mix /, "rtk mix ")],
  [/^iex\s+/, (c) => c.replace(/^iex /, "rtk iex ")],
]

/**
 * Split a command on top-level separators (`&&`, `||`, `;`, `|`), ignoring any
 * that appear inside single or double quotes. The result interleaves segments
 * (even indices) and separators (odd indices), so joining it reproduces the
 * original string exactly. Surrounding whitespace is folded into the separator.
 *
 * Backslash escapes are honored outside single quotes (in unquoted text and
 * inside double quotes, `\<ch>` is copied verbatim, so an escaped quote does
 * not toggle quote state). Inside single quotes the backslash is literal, per
 * POSIX shell rules.
 */
function splitTopLevel(command: string): string[] {
  const parts: string[] = []
  let buf = ""
  let quote: string | null = null

  for (let i = 0; i < command.length; i++) {
    const ch = command[i]

    // Backslash escapes the next char everywhere except inside single quotes.
    // Copy both chars verbatim so an escaped quote can't toggle quote state.
    if (ch === "\\" && quote !== "'" && i + 1 < command.length) {
      buf += ch + command[i + 1]
      i++
      continue
    }

    // Inside a quoted span: copy verbatim until the matching quote closes.
    if (quote) {
      buf += ch
      if (ch === quote) quote = null
      continue
    }

    if (ch === "'" || ch === '"') {
      quote = ch
      buf += ch
      continue
    }

    // Detect a top-level separator. Check the two-char operators first so `||`
    // wins over `|`.
    const two = command.slice(i, i + 2)
    let sep: string | null = null
    if (two === "&&" || two === "||") sep = two
    else if (ch === ";" || ch === "|") sep = ch

    if (sep) {
      // Consume trailing whitespace after the operator.
      let j = i + sep.length
      let ws = ""
      while (j < command.length && /\s/.test(command[j])) {
        ws += command[j]
        j++
      }
      // Pull leading whitespace before the operator off the segment buffer.
      const lead = buf.match(/\s*$/)?.[0] ?? ""
      parts.push(buf.slice(0, buf.length - lead.length))
      parts.push(lead + sep + ws)
      buf = ""
      i = j - 1
      continue
    }

    buf += ch
  }

  parts.push(buf)
  return parts
}

/**
 * Rewrite a single command segment (no top-level operators). Returns the
 * rewritten segment, or null if no rule matched.
 */
function rewriteSegment(segment: string): string | null {
  // Already using rtk
  if (/^(.*\/)?rtk\s/.test(segment)) return null

  // Skip heredocs — only this segment is left untouched, not the whole command.
  if (segment.indexOf("<<") !== -1) return null

  // Strip leading env-var assignments for matching, preserve for output
  const envMatch = segment.match(ENV_PREFIX_RE)
  const envPrefix = envMatch ? envMatch[0] : ""
  const body = envPrefix ? segment.slice(envPrefix.length) : segment

  for (const [pattern, rewriter] of RULES) {
    if (pattern.test(body)) {
      return envPrefix + rewriter(body)
    }
  }

  return null
}

/**
 * Attempt to rewrite a command through RTK. Splits compound commands on
 * top-level operators (`&&`, `||`, `;`, `|`) and rewrites each segment
 * independently; segments that don't match a rule (or contain a heredoc) are
 * left untouched. Returns the rewritten command string, or null if no segment
 * matched.
 */
export function rewrite(command: unknown): string | null {
  if (typeof command !== "string") return null

  // Split into segments and separators. Separators are interleaved at odd
  // indices; quoted spans are never split.
  const parts = splitTopLevel(command)

  let changed = false
  const out = parts.map((part, i) => {
    // Odd indices are the captured separators — leave untouched.
    if (i % 2 === 1) return part

    // Preserve surrounding whitespace, rewrite the trimmed segment.
    const leading = part.match(/^\s*/)?.[0] ?? ""
    const trailing = part.match(/\s*$/)?.[0] ?? ""
    const segment = part.slice(leading.length, part.length - trailing.length)

    const rewritten = rewriteSegment(segment)
    if (rewritten === null) return part

    changed = true
    return leading + rewritten + trailing
  })

  return changed ? out.join("") : null
}
