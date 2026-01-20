# agentmine Installation Guide

## Prerequisites

### System Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Linux, macOS, Windows (WSL2) |
| **Git** | 2.25+ (git worktree support) |
| **Node.js** | 20.x or later |
| **pnpm** | 9.x or later |
| **Database** | PostgreSQL 15+ or SQLite 3.35+ |

### Optional Requirements

| Component | Use Case |
|-----------|----------|
| **Claude Code** | Worker AI (推奨) |
| **Cursor/Windsurf** | MCP経由でのOrchestrator操作 |
| **Docker** | PostgreSQL（開発環境） |

---

## Installation Methods

### Method 1: From Source（推奨 - 開発・カスタマイズ）

#### 1. Clone Repository

```bash
git clone https://github.com/krtw00/agentmine.git
cd agentmine
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Build Packages

```bash
pnpm build
```

#### 4. Link CLI Globally

```bash
cd packages/cli
pnpm link --global
```

#### 5. Verify Installation

```bash
agentmine --version
# Expected: agentmine/0.1.0 (or current version)
```

---

### Method 2: npm Package（簡易 - 本番利用）

**Status**: ⏳ Phase 1完了後に提供予定

```bash
npm install -g @agentmine/cli
agentmine --version
```

---

## Component Installation

### 1. CLI Installation

CLIはagentmineの中核コンポーネント。

```bash
# From source
cd agentmine
pnpm install
pnpm build
cd packages/cli && pnpm link --global

# Verify
agentmine --help
```

**インストール先**:
- **Linux/macOS**: `~/.local/share/pnpm/global/5/node_modules/@agentmine/cli`
- **Windows**: `%APPDATA%\npm\node_modules\@agentmine\cli`

**設定ファイル**: `~/.agentmine/config.yaml`（初回実行時に自動生成）

---

### 2. Web UI Installation

Web UIはタスク管理・Agent定義・Worker監視を提供。

#### Development Mode

```bash
cd packages/web
pnpm dev
# → http://localhost:3000
```

#### Production Build

```bash
cd packages/web
pnpm build
pnpm start
# → http://localhost:3000
```

#### Docker Deployment

```bash
docker build -t agentmine-web -f packages/web/Dockerfile .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host/db" \
  agentmine-web
```

**環境変数**:
- `DATABASE_URL` - PostgreSQL接続URL（必須）
- `NEXTAUTH_URL` - 認証URL（本番環境で必須）
- `NEXTAUTH_SECRET` - 認証シークレット（本番環境で必須）

---

### 3. MCP Server Installation

MCP ServerはCursor/Windsurf等のIDE統合を提供。

#### 1. MCP Server起動

```bash
agentmine mcp start
# → localhost:3001（デフォルト）
```

#### 2. Cursor設定

```json
// ~/.cursor/config.json
{
  "mcp": {
    "servers": {
      "agentmine": {
        "command": "agentmine",
        "args": ["mcp", "start"],
        "env": {
          "AGENTMINE_DB_URL": "postgres://user:pass@host/db"
        }
      }
    }
  }
}
```

#### 3. Windsurf設定

```json
// ~/.windsurf/settings.json
{
  "mcp.servers": [
    {
      "name": "agentmine",
      "command": ["agentmine", "mcp", "start"],
      "env": {
        "AGENTMINE_DB_URL": "postgres://user:pass@host/db"
      }
    }
  ]
}
```

**詳細設定**: **@../06-interfaces/mcp/overview.md** を参照

---

## Database Setup

### Option 1: PostgreSQL（チーム開発・本番推奨）

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: agentmine
      POSTGRES_PASSWORD: password
      POSTGRES_DB: agentmine
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

```bash
docker compose up -d
```

#### Native Installation

```bash
# Ubuntu/Debian
sudo apt install postgresql-15

# macOS
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb agentmine
```

#### Initialize Schema

```bash
export AGENTMINE_DB_URL="postgres://agentmine:password@localhost/agentmine"
agentmine db migrate
```

---

### Option 2: SQLite（個人開発・テスト）

```bash
# 自動作成（初回実行時）
agentmine task list
# → .agentmine/data.db が自動生成

# または明示的に指定
export AGENTMINE_DB_URL="sqlite://.agentmine/data.db"
agentmine db migrate
```

**制限事項**:
- チーム共有不可
- 同時アクセス性能低下
- トランザクション機能制限

---

## Post-Installation

### 1. Initialize Project

```bash
cd your-project
agentmine init
```

**生成されるもの**:
```
.agentmine/
├── config.yaml        # プロジェクト設定
└── worktrees/         # Worker作業ディレクトリ（自動作成）
```

### 2. Verify Setup

```bash
agentmine status
```

**期待される出力**:
```
✓ Database: Connected (PostgreSQL 15.3)
✓ Git: Repository detected
✓ Workers: 0 running
✓ Tasks: 0 pending
```

### 3. Create First Task

```bash
agentmine task add "初期セットアップ完了確認"
agentmine task list
```

---

## Troubleshooting

### Issue 1: `agentmine: command not found`

**原因**: PATHが通っていない

**解決**:
```bash
# pnpm global binディレクトリを確認
pnpm bin -g

# PATHに追加（~/.bashrc or ~/.zshrc）
export PATH="$(pnpm bin -g):$PATH"

# 再読み込み
source ~/.bashrc  # or source ~/.zshrc
```

### Issue 2: Database Connection Failed

**原因**: DATABASE_URL未設定またはDB起動していない

**解決**:
```bash
# PostgreSQL起動確認
docker compose ps  # Docker使用時
pg_isready -h localhost  # Native使用時

# 環境変数確認
echo $AGENTMINE_DB_URL

# 設定（~/.bashrc or ~/.zshrc）
export AGENTMINE_DB_URL="postgres://user:pass@localhost/agentmine"
```

### Issue 3: `git worktree` Command Failed

**原因**: Git 2.25未満

**解決**:
```bash
# Git version確認
git --version

# Update Git
# Ubuntu/Debian
sudo add-apt-repository ppa:git-core/ppa
sudo apt update && sudo apt install git

# macOS
brew upgrade git
```

### Issue 4: Permission Denied on Worktree

**原因**: chmod適用後のファイルアクセス

**解決**:
```bash
# Workerを停止してから確認
agentmine worker stop <id>

# 権限確認
ls -la .agentmine/worktrees/task-<id>/

# 強制削除（緊急時のみ）
sudo rm -rf .agentmine/worktrees/task-<id>/
```

---

## Upgrade

### CLI Upgrade

```bash
# From source
cd agentmine
git pull
pnpm install
pnpm build

# npm package（Phase 1以降）
npm update -g @agentmine/cli
```

### Database Migration

```bash
# マイグレーション実行
agentmine db migrate

# ロールバック（必要時）
agentmine db rollback
```

### Breaking Changes

**v0.1.x → v0.2.x**:
- スコープ制御仕様変更（read省略可能化）
- Agent定義フォーマット変更

**Migration Guide**: リリースノート参照

---

## Uninstallation

### CLI Uninstall

```bash
# pnpm global unlink
pnpm unlink --global @agentmine/cli

# npm（Phase 1以降）
npm uninstall -g @agentmine/cli
```

### Data Cleanup

```bash
# プロジェクトデータ削除
rm -rf .agentmine/

# グローバル設定削除
rm -rf ~/.agentmine/

# PostgreSQL削除（必要時）
docker compose down -v  # Docker使用時
dropdb agentmine        # Native使用時
```

---

## Related Documents

- **@./configuration.md** - 初期設定・環境変数
- **@../06-interfaces/cli/overview.md** - CLIコマンド詳細
- **@../06-interfaces/web/overview.md** - Web UI設定
- **@../06-interfaces/mcp/overview.md** - MCP統合設定
- **@../01-introduction/overview.md** - プロジェクト概要
