#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

detect_os() {
    log_step "检测操作系统..."
    
    OS="$(uname -s)"
    ARCH="$(uname -m)"
    
    case "${OS}" in
        Darwin*)
            OS_TYPE="macos"
            log_success "检测到 macOS (${ARCH})"
            ;;
        Linux*)
            OS_TYPE="linux"
            log_success "检测到 Linux (${ARCH})"
            ;;
        *)
            log_error "不支持的操作系统: ${OS}"
            exit 1
            ;;
    esac
}

detect_package_manager() {
    log_step "检测包管理器..."
    
    if command -v brew &> /dev/null; then
        PKG_MANAGER="brew"
        log_success "检测到 Homebrew"
    elif command -v cargo &> /dev/null; then
        PKG_MANAGER="cargo"
        log_success "检测到 Cargo"
    else
        PKG_MANAGER="curl"
        log_warn "未检测到包管理器，将使用 curl 安装"
    fi
}

check_rtk_installed() {
    if command -v rtk &> /dev/null; then
        RTK_VERSION=$(rtk --version 2>/dev/null || echo "unknown")
        log_warn "RTK 已安装 (版本: ${RTK_VERSION})"
        return 0
    fi
    return 1
}

install_rtk() {
    log_step "安装 RTK (Rust Token Killer)..."
    
    if check_rtk_installed; then
        read -p "是否更新 RTK? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "跳过 RTK 安装"
            return 0
        fi
    fi
    
    case "${PKG_MANAGER}" in
        brew)
            log_info "使用 Homebrew 安装..."
            brew install rtk
            ;;
        cargo)
            log_info "使用 Cargo 安装..."
            cargo install --git https://github.com/rtk-ai/rtk
            ;;
        *)
            log_info "使用 curl 安装..."
            curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
            
            if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
                log_warn "添加 ~/.local/bin 到 PATH"
                
                if [ -n "$ZSH_VERSION" ]; then
                    SHELL_RC="$HOME/.zshrc"
                elif [ -n "$BASH_VERSION" ]; then
                    SHELL_RC="$HOME/.bashrc"
                else
                    SHELL_RC="$HOME/.profile"
                fi
                
                echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
                export PATH="$HOME/.local/bin:$PATH"
                
                log_info "已添加到 ${SHELL_RC}"
            fi
            ;;
    esac
    
    if command -v rtk &> /dev/null; then
        RTK_VERSION=$(rtk --version 2>/dev/null || echo "unknown")
        log_success "RTK 安装成功 (版本: ${RTK_VERSION})"
    else
        log_error "RTK 安装失败"
        exit 1
    fi
}

configure_opencode_plugin() {
    log_step "配置 OpenCode 插件..."
    
    OPENCODE_CONFIG_DIR="$HOME/.config/opencode/plugins"
    mkdir -p "$OPENCODE_CONFIG_DIR"
    
    if [ -f "$OPENCODE_CONFIG_DIR/rtk.ts" ]; then
        log_warn "OpenCode RTK 插件已存在"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "跳过插件配置"
            return 0
        fi
    fi
    
    log_info "运行 rtk init -g --opencode..."
    rtk init -g --opencode --auto-patch
    
    log_success "OpenCode 插件配置完成"
}

verify_installation() {
    log_step "验证安装..."
    
    echo ""
    echo "=========================================="
    echo "        安装验证结果"
    echo "=========================================="
    
    if command -v rtk &> /dev/null; then
        RTK_VERSION=$(rtk --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓${NC} RTK: ${RTK_VERSION}"
    else
        echo -e "${RED}✗${NC} RTK: 未安装"
    fi
    
    if [ -f "$HOME/.config/opencode/plugins/rtk.ts" ]; then
        echo -e "${GREEN}✓${NC} OpenCode 插件: 已配置"
    else
        echo -e "${RED}✗${NC} OpenCode 插件: 未配置"
    fi
    
    if command -v rtk &> /dev/null; then
        log_info "测试 RTK 功能..."
        
        if rtk gain &> /dev/null; then
            echo -e "${GREEN}✓${NC} RTK gain: 正常"
        else
            echo -e "${YELLOW}!${NC} RTK gain: 需要首次使用后才有数据"
        fi
        
        if rtk ls &> /dev/null; then
            echo -e "${GREEN}✓${NC} RTK ls: 正常"
        else
            echo -e "${YELLOW}!${NC} RTK ls: 测试失败"
        fi
    fi
    
    echo "=========================================="
    echo ""
}

show_usage_guide() {
    echo ""
    echo -e "${CYAN}=========================================="
    echo "        使用指南"
    echo -e "==========================================${NC}"
    echo ""
    echo "1. 重启 OpenCode 以加载插件"
    echo ""
    echo "2. RTK 常用命令:"
    echo "   rtk git status    # 压缩 git 状态输出"
    echo "   rtk git diff      # 压缩 diff 输出"
    echo "   rtk ls            # 优化目录列表"
    echo "   rtk gain          # 查看 token 节省统计"
    echo "   rtk gain --graph  # 图表展示节省情况"
    echo ""
    echo "3. 自动重写钩子已启用，以下命令会自动压缩:"
    echo "   git status -> rtk git status"
    echo "   ls -> rtk ls"
    echo "   cat <file> -> rtk read <file>"
    echo "   cargo test -> rtk cargo test"
    echo "   npm test -> rtk vitest run"
    echo ""
    echo "4. 查看配置:"
    echo "   rtk init --show"
    echo ""
    echo "5. 卸载 (如需要):"
    echo "   rtk init -g --uninstall"
    echo "   brew uninstall rtk  # 或 cargo uninstall rtk"
    echo ""
    echo -e "${GREEN}预计可节省 60-90% 的 LLM token 消耗！${NC}"
    echo ""
}

cleanup() {
    if [ $? -ne 0 ]; then
        log_error "安装过程中出现错误"
        echo ""
        echo "请检查错误信息并重试，或手动安装:"
        echo "  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh"
        echo "  rtk init -g --opencode"
    fi
}

main() {
    trap cleanup EXIT
    
    echo ""
    echo -e "${CYAN}=========================================="
    echo "   RTK + OpenCode 一键部署脚本"
    echo -e "==========================================${NC}"
    echo ""
    
    if [ "$EUID" -eq 0 ]; then 
        log_warn "检测到 root 用户，建议使用普通用户运行"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "已取消安装"
            exit 0
        fi
    fi
    
    detect_os
    detect_package_manager
    install_rtk
    configure_opencode_plugin
    verify_installation
    show_usage_guide
    
    log_success "安装完成！"
    echo ""
}

main "$@"
