# openrtk

OpenCode plugin for [RTK](https://github.com/rtk-ai/rtk) (Rust Token Killer). Reduces LLM token consumption by 60-90% on common dev commands by transparently routing them through RTK's output compression.

A lightweight OpenCode plugin that intercepts shell commands and pipes them through RTK for automatic output compression. The model sees full output while RTK handles token reduction behind the scenes — no changes needed to prompts or workflow.

## Prerequisites

Install RTK:

```bash
cargo install rtk
```

## Installation

Install via npm:

```bash
npm install openrtk
```

Then add to your OpenCode config (`opencode.json` or `.opencode/opencode.json`):

```json
{
  "plugins": ["openrtk"]
}
```

Or point your config at the `src/` directory in a local checkout. This repo loads itself through `.opencode/plugins/openrtk.ts`.

## OpenCode compatibility

OpenCode 2 replaced the plugin API, and V1 plugins no longer load there. This package exports both entrypoints from one module: OpenCode 2 reads `id`/`setup`, OpenCode 1 calls `server()`. No configuration change is needed on either version.

## How it works

The plugin rewrites shell commands to go through RTK before execution. This is fully transparent to the model.

- OpenCode 2: a `create.before` hook on the shell domain.
- OpenCode 1: a `tool.execute.before` hook, filtered to the `bash` and `shell` tools.

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

## Development

```bash
npm run build     # build the plugin
npm test          # run tests
```

## License

MIT
