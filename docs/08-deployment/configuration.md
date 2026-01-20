# agentmine Configuration Guide

## Configuration Hierarchy

agentmineは3層の設定構造を持ちます：

```
1. グローバル設定（~/.agentmine/config.yaml）
   ├─ すべてのプロジェクトで共有
   └─ DB接続、デフォルトAgent等

2. プロジェクト設定（.agentmine/config.yaml）
   ├─ プロジェクト固有設定
   └─ グローバル設定を上書き

3. 環境変数（AGENTMINE_*）
   ├─ 実行時設定
   └─ すべての設定を上書き（最優先）
```

---

## Global Configuration

### Location

- **Linux/macOS**: `~/.agentmine/config.yaml`
- **Windows**: `%USERPROFILE%\.agentmine\config.yaml`

### Default Configuration

```yaml
# ~/.agentmine/config.yaml
database:
  url: "sqlite://~/.agentmine/data.db"  # デフォルトDB
  pool:
    min: 2
    max: 10

worker:
  defaultClient: "claude-code"
  autoApprove: false
  timeout: 3600  # 1時間

logging:
  level: "info"
  file: "~/.agentmine/logs/agentmine.log"

mcp:
  port: 3001
  host: "localhost"
```

### Common Settings

#### Database Configuration

```yaml
database:
  # PostgreSQL（チーム開発）
  url: "postgres://user:pass@host:5432/agentmine"

  # SQLite（個人開発）
  url: "sqlite://~/.agentmine/data.db"

  # Connection pool
  pool:
    min: 2
    max: 10
    idleTimeout: 30000
```

#### Worker Settings

```yaml
worker:
  defaultClient: "claude-code"  # デフォルトWorker AI
  autoApprove: false            # 自動承認モード（危険）
  timeout: 3600                 # タイムアウト（秒）

  # Worktree設定
  worktreeDir: ".agentmine/worktrees"

  # 監視設定（Phase 4）
  monitor:
    interval: 60              # ポーリング間隔（秒）
    errorThreshold: 5         # エラー閾値
    stagnantMinutes: 30       # 停滞判定時間
```

#### Logging Configuration

```yaml
logging:
  level: "info"  # debug, info, warn, error
  file: "~/.agentmine/logs/agentmine.log"
  maxSize: 10485760  # 10MB
  maxFiles: 5
```

---

## Project Configuration

### Location

`.agentmine/config.yaml`（プロジェクトルート）

### Initial Setup

```bash
cd your-project
agentmine init
# → .agentmine/config.yaml 自動生成
```

### Example Configuration

```yaml
# .agentmine/config.yaml
project:
  name: "my-app"
  description: "Sample application"

database:
  # プロジェクト専用DB（オプション）
  url: "postgres://user:pass@localhost/myapp_agentmine"

agents:
  # プロジェクト共通Agent設定
  defaults:
    client: "claude-code"
    model: "sonnet"
    scope:
      exclude:
        - "**/*.env"
        - "**/secrets/**"
        - "**/node_modules/**"

memory:
  # Memory Bank設定
  autoInject: true
  categories:
    - "architecture"
    - "conventions"
    - "setup"

worktree:
  # Worktree設定
  basePath: ".agentmine/worktrees"
  branchPrefix: "agent"
```

---

## Environment Variables

環境変数は最優先で適用されます。

### Database

```bash
# PostgreSQL
export AGENTMINE_DB_URL="postgres://user:pass@host/db"

# SQLite
export AGENTMINE_DB_URL="sqlite://.agentmine/data.db"
```

### Worker Settings

```bash
# デフォルトWorker AI
export AGENTMINE_WORKER_CLIENT="claude-code"

# 自動承認モード（危険）
export AGENTMINE_WORKER_AUTO_APPROVE="true"

# タイムアウト（秒）
export AGENTMINE_WORKER_TIMEOUT="7200"
```

### Logging

```bash
# ログレベル
export AGENTMINE_LOG_LEVEL="debug"

# ログファイル
export AGENTMINE_LOG_FILE="/var/log/agentmine.log"
```

### MCP Server

```bash
# ポート
export AGENTMINE_MCP_PORT="3001"

# ホスト
export AGENTMINE_MCP_HOST="0.0.0.0"
```

---

## Agent Definition

Agent定義は3つの方法で管理できます。

### Method 1: Database（推奨）

```bash
# CLI経由でDB登録
agentmine agent add frontend \
  --client claude-code \
  --model sonnet \
  --scope-exclude "**/*.env" \
  --scope-write "src/frontend/**"
```

### Method 2: YAML File

```yaml
# .agentmine/agents/frontend.yaml
name: frontend
client: claude-code
model: sonnet
scope:
  exclude:
    - "**/*.env"
    - "**/secrets/**"
  write:
    - "src/frontend/**"
    - "tests/frontend/**"
prompt:
  system: |
    あなたはフロントエンド開発担当です。
    React/TypeScriptを使用します。
  guidelines:
    - "ESLint/Prettierに従う"
    - "shadcn/uiを使用"
```

```bash
# YAMLからDB登録
agentmine agent import .agentmine/agents/frontend.yaml
```

### Method 3: Inline（タスク作成時）

```bash
agentmine task add "ログイン画面実装" \
  --agent-inline '{
    "client": "claude-code",
    "scope": {
      "write": ["src/auth/**"]
    }
  }'
```

---

## Database Configuration Details

### PostgreSQL (Production)

#### Basic Setup

```yaml
database:
  url: "postgres://agentmine:password@localhost:5432/agentmine"
  pool:
    min: 5
    max: 20
```

#### SSL Configuration

```yaml
database:
  url: "postgres://user:pass@host/db?sslmode=require"
  ssl:
    rejectUnauthorized: true
    ca: "/path/to/ca-cert.pem"
```

#### Connection Pooling

```yaml
database:
  pool:
    min: 2                # 最小接続数
    max: 10               # 最大接続数
    idleTimeout: 30000    # アイドルタイムアウト（ms）
    acquireTimeout: 60000 # 取得タイムアウト（ms）
```

### SQLite (Development)

```yaml
database:
  url: "sqlite://.agentmine/data.db"
  options:
    busyTimeout: 5000
    journal: "WAL"  # Write-Ahead Logging
```

---

## Scope Control Configuration

スコープ制御はAgent定義で指定します。

### Default Pattern（案2）

```yaml
scope:
  exclude:  # これ以外は自動的に読み取り可能
    - "**/*.env"
    - "**/secrets/**"
    - "**/node_modules/**"
    - "**/.git/**"

  # read: 省略可能（excludeを除く全ファイル）

  write:    # 編集可能
    - "src/**"
    - "tests/**"
```

### Strict Pattern（明示的read指定）

```yaml
scope:
  exclude:
    - "**/*.env"
    - "**/secrets/**"

  read:     # 明示的に読み取り可能指定
    - "src/**"
    - "tests/**"
    - "docs/**"
    - "*.md"

  write:
    - "src/auth/**"
    - "tests/auth/**"
```

### Frontend Example

```yaml
scope:
  exclude:
    - "**/*.env"
    - "**/secrets/**"
    - "packages/backend/**"  # バックエンドコードは除外

  write:
    - "packages/web/**"
    - "docs/web/**"
```

**詳細**: **@../03-core-concepts/scope-control.md** を参照

---

## Memory Bank Configuration

### Auto Injection Settings

```yaml
memory:
  autoInject: true  # Worker起動時に自動注入

  # 注入対象カテゴリ
  categories:
    - "architecture"   # アーキテクチャ知識
    - "conventions"    # コーディング規約
    - "setup"          # セットアップ手順

  # 出力先
  outputDir: ".agentmine-worker/memory"

  # 要約設定
  summarize:
    enabled: true
    maxTokens: 4000
```

### Memory Categories

```yaml
memory:
  categories:
    architecture:
      priority: high
      format: "markdown"

    conventions:
      priority: medium
      format: "markdown"

    troubleshooting:
      priority: low
      format: "markdown"
```

**詳細**: **@../05-features/memory-bank.md** を参照

---

## Web UI Configuration

### Next.js Environment

```bash
# .env.local（packages/web/）
DATABASE_URL="postgres://user:pass@host/db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### Production Deployment

```bash
# 本番環境変数
DATABASE_URL="postgres://prod-user:pass@prod-host/db"
NEXTAUTH_URL="https://agentmine.yourdomain.com"
NEXTAUTH_SECRET="production-secret-key"
NODE_ENV="production"
```

**詳細**: **@../06-interfaces/web/overview.md** を参照

---

## MCP Server Configuration

### Basic Setup

```yaml
mcp:
  port: 3001
  host: "localhost"

  # 認証（オプション）
  auth:
    enabled: false
    token: "your-secret-token"
```

### IDE Integration

#### Cursor

```json
// ~/.cursor/config.json
{
  "mcp": {
    "servers": {
      "agentmine": {
        "command": "agentmine",
        "args": ["mcp", "start"],
        "env": {
          "AGENTMINE_DB_URL": "postgres://user:pass@host/db",
          "AGENTMINE_MCP_PORT": "3001"
        }
      }
    }
  }
}
```

#### Windsurf

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

**詳細**: **@../06-interfaces/mcp/overview.md** を参照

---

## Advanced Configuration

### Multi-Project Setup

```yaml
# ~/.agentmine/config.yaml
projects:
  project-a:
    database:
      url: "postgres://user:pass@host/project_a"

  project-b:
    database:
      url: "postgres://user:pass@host/project_b"
```

```bash
# プロジェクト切り替え
agentmine config set-project project-a
```

### Custom Worker Client

```yaml
worker:
  clients:
    custom-ai:
      command: "my-ai-tool"
      args: ["--mode", "agent"]
      env:
        AI_API_KEY: "${MY_AI_KEY}"
```

```bash
# カスタムWorker使用
agentmine worker run 1 --client custom-ai
```

### Webhook Notifications

```yaml
notifications:
  webhook:
    enabled: true
    url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    events:
      - "worker.completed"
      - "worker.failed"
```

---

## Configuration Validation

### Validate Settings

```bash
agentmine config validate
```

**期待される出力**:
```
✓ Database connection: OK
✓ Worker client: claude-code (available)
✓ Worktree directory: .agentmine/worktrees (writable)
✓ Memory Bank: 3 categories configured
✗ MCP Server: Port 3001 already in use
```

### Show Current Configuration

```bash
agentmine config show
```

**出力例**:
```yaml
database:
  url: "postgres://***@localhost/agentmine"
  pool: {min: 2, max: 10}
worker:
  defaultClient: "claude-code"
  timeout: 3600
```

---

## Migration from DevHive

### Import DevHive Configuration

```bash
# .devhive.yaml を agentmine設定に変換
agentmine migrate --from-devhive .devhive.yaml
```

**変換内容**:
- `workers` → `tasks` (DB登録)
- `roles` → `agents` (DB登録)
- `.devhive/tasks/` → Memory Bank
- `.devhive/roles/` → Agent prompt

**詳細**: **@../01-introduction/devhive-migration.md** を参照

---

## Configuration Best Practices

### Security

1. **機密情報は環境変数で**:
```bash
# ❌ 避ける
database:
  url: "postgres://user:password123@host/db"

# ✅ 推奨
export AGENTMINE_DB_URL="postgres://user:password123@host/db"
```

2. **スコープ制御を厳格に**:
```yaml
scope:
  exclude:
    - "**/*.env"
    - "**/*.pem"
    - "**/secrets/**"
```

3. **autoApproveは慎重に**:
```yaml
worker:
  autoApprove: false  # デフォルト推奨
```

### Performance

1. **PostgreSQL接続プール調整**:
```yaml
database:
  pool:
    max: 20  # Worker数 × 2 を目安
```

2. **Worktreeクリーンアップ自動化**:
```yaml
worktree:
  autoCleanup: true
  retentionDays: 7
```

### Team Collaboration

1. **共有DB使用**:
```bash
export AGENTMINE_DB_URL="postgres://team@shared-host/agentmine"
```

2. **プロジェクト設定をGit管理**:
```bash
git add .agentmine/config.yaml
git add .agentmine/agents/
```

---

## Related Documents

- **@./installation.md** - インストール手順
- **@../03-core-concepts/scope-control.md** - スコープ制御詳細
- **@../05-features/memory-bank.md** - Memory Bank設定
- **@../06-interfaces/cli/overview.md** - CLIコマンド
- **@../06-interfaces/mcp/overview.md** - MCP統合
