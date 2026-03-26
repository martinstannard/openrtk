# openrtk

OpenCode plugin for [RTK](https://github.com/rtk-ai/rtk) (Rust Token Killer). Reduces LLM token consumption by 60-90% on common dev commands by transparently routing them through RTK's output compression.

A lightweight OpenCode plugin that intercepts shell commands and pipes them through RTK for automatic output compression. The model sees full output while RTK handles token reduction behind the scenes — no changes needed to prompts or workflow.

## Prerequisites

Install RTK:

```bash
cargo install rtk
```

## Installation

### Option 1: One-Click Deployment (Recommended)

Run the automated installation script:

```bash
curl -fsSL https://raw.githubusercontent.com/gyc567/openrtk/main/install-rtk-opencode.sh | bash
```

Or download and run locally:

```bash
chmod +x install-rtk-opencode.sh
./install-rtk-opencode.sh
```

This script will:
- Detect your operating system (macOS/Linux)
- Detect available package managers (Homebrew/Cargo/curl)
- Install RTK automatically
- Configure OpenCode plugin
- Initialize RTK hook
- Verify installation

### Option 2: Manual Installation

Install via npm:

```bash
npm install openrtk
```

Then add to your OpenCode config (`opencode.json` or `.opencode/config.json`):

```json
{
  "plugin": ["openrtk"]
}
```

Or copy `src/index.ts` directly into `.opencode/plugins/` for local use.

## How it works

The plugin hooks into OpenCode's `tool.execute.before` event and rewrites shell commands to go through RTK before execution. This is fully transparent to the model.

```
git status       ->  rtk git status       (72% savings)
cargo test       ->  rtk cargo test       (80% savings)
docker ps        ->  rtk docker ps        (65% savings)
```

### Supported commands

| Category | Commands |
|----------|----------|
| Git | status, diff, log, add, commit, push, pull, branch, fetch, stash, show |
| GitHub CLI | pr, issue, run, api, release |
| Rust | cargo test/build/clippy/check/install/fmt |
| File ops | cat, grep, rg, ls, tree, find, diff |
| JS/TS | vitest, npm test/run, tsc, eslint, prettier, playwright, prisma |
| Containers | docker (compose/ps/images/logs/run/build/exec), kubectl (get/logs/describe/apply) |
| Network | curl, wget |
| Python | pytest, ruff, pip, uv pip |
| Go | go test/build/vet, golangci-lint |
| Packages | pnpm list/ls/outdated |

### System prompt

Copy `opencode.md` into your project or user config to teach the model about `rtk gain` and other meta commands.

## RTK Usage

After installation, you can use RTK commands directly:

```bash
rtk git status          # Compact git status output
rtk git diff           # Streamlined diff output
rtk ls                 # Optimized directory listing
rtk gain               # View token savings statistics
rtk gain --graph       # Visualize savings with a graph
rtk discover           # Analyze history for optimization opportunities
```

### Automatic Rewrite

With the hook enabled, commands are automatically rewritten:

- `git status` → `rtk git status`
- `ls -la` → `rtk ls -la`
- `cat <file>` → `rtk read <file>`
- `cargo test` → `rtk cargo test`
- `npm test` → `rtk vitest run`

## Development

```bash
npm run build     # build the plugin
npm test          # run tests
```

## Uninstall

To remove RTK and OpenCode plugin:

```bash
rtk init -g --uninstall
brew uninstall rtk  # or: cargo uninstall rtk
```

## License

MIT