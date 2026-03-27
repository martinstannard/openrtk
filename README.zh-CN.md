# openrtk

[RTK](https://github.com/rtk-ai/rtk)（Rust Token Killer）的 OpenCode 插件。通过 RTK 的输出压缩功能，将常见开发命令的 LLM token 消耗降低 60-90%。

这是一个轻量级的 OpenCode 插件，它拦截 shell 命令并通过 RTK 进行自动输出压缩。模型看到完整输出，而 RTK 在后台处理 token 减少 — 无需更改提示词或工作流程。

## 前置条件

安装 RTK：

```bash
cargo install rtk
```

## 安装

### 方式一：一键部署（推荐）

运行自动化安装脚本：

```bash
curl -fsSL https://raw.githubusercontent.com/gyc567/openrtk/main/install-rtk-opencode.sh | bash
```

或下载到本地运行：

```bash
chmod +x install-rtk-opencode.sh
./install-rtk-opencode.sh
```

此脚本将：
- 检测您的操作系统（macOS/Linux）
- 检测可用的包管理器（Homebrew/Cargo/curl）
- 自动安装 RTK
- 配置 OpenCode 插件
- 初始化 RTK hook
- 验证安装

### 方式二：手动安装

通过 npm 安装：

```bash
npm install openrtk
```

然后添加到您的 OpenCode 配置（`opencode.json` 或 `.opencode/config.json`）：

```json
{
  "plugin": ["openrtk"]
}
```

或直接将 `src/index.ts` 复制到 `.opencode/plugins/` 用于本地使用。

## 工作原理

该插件挂载到 OpenCode 的 `tool.execute.before` 事件，在执行前将 shell 命令重写为通过 RTK 运行。这对模型完全透明。

```
git status       ->  rtk git status       (节省 72%)
cargo test       ->  rtk cargo test       (节省 80%)
docker ps        ->  rtk docker ps        (节省 65%)
```

### 支持的命令

| 分类 | 命令 |
|------|------|
| Git | status, diff, log, add, commit, push, pull, branch, fetch, stash, show |
| GitHub CLI | pr, issue, run, api, release |
| Rust | cargo test/build/clippy/check/install/fmt |
| 文件操作 | cat, grep, rg, ls, tree, find, diff |
| JS/TS | vitest, npm test/run, tsc, eslint, prettier, playwright, prisma |
| 容器 | docker (compose/ps/images/logs/run/build/exec), kubectl (get/logs/describe/apply) |
| 网络 | curl, wget |
| Python | pytest, ruff, pip, uv pip |
| Go | go test/build/vet, golangci-lint |
| 包管理 | pnpm list/ls/outdated |

### 系统提示词

将 `opencode.md` 复制到您的项目或用户配置中，以告诉模型关于 `rtk gain` 等元命令。

## RTK 使用方法

安装后，您可以直接使用 RTK 命令：

```bash
rtk git status          # 紧凑的 git status 输出
rtk git diff           # 精简的 diff 输出
rtk ls                 # 优化后的目录列表
rtk gain               # 查看 token 节省统计
rtk gain --graph       # 用图表可视化节省情况
rtk discover           # 分析历史记录以发现优化机会
```

### 自动重写

启用 hook 后，命令会自动重写：

- `git status` → `rtk git status`
- `ls -la` → `rtk ls -la`
- `cat <file>` → `rtk read <file>`
- `cargo test` → `rtk cargo test`
- `npm test` → `rtk vitest run`

## 开发

```bash
npm run build     # 构建插件
npm test          # 运行测试
```

## 卸载

要移除 RTK 和 OpenCode 插件：

```bash
rtk init -g --uninstall
brew uninstall rtk  # 或：cargo uninstall rtk
```

## 许可证

MIT