# 開発環境セットアップ / Development Setup

---

## 前提条件 / Prerequisites

| ツール / Tool | バージョン / Version | 備考 / Notes |
|--------------|---------------------|-------------|
| Node.js | >= 20 | |
| pnpm | 10.28.2 | corepackで自動管理 / Auto-managed via corepack |
| Git | >= 2.x | |
| Docker + Compose | 最新推奨 / Latest | Docker開発の場合のみ / Only for Docker development |

---

## リポジトリのクローン / Clone the Repository

```bash
git clone https://github.com/<your-fork>/AgentMine.git
cd AgentMine
```

---

## 方法A: Node.jsネイティブ開発（推奨）/ Option A: Native Node.js (Recommended)

### 1. pnpmの有効化 / Enable pnpm

```bash
corepack enable
```

corepackがプロジェクトで指定されたpnpmバージョンを自動的にインストールします。

Corepack automatically installs the pnpm version specified in the project.

### 2. 依存パッケージのインストール / Install Dependencies

```bash
pnpm install
```

### 3. データベースのセットアップ / Database Setup

```bash
cd packages/db
pnpm generate
pnpm migrate
cd ../..
```

SQLiteデータベースが `packages/db/data/agentmine.db` に作成されます。

A SQLite database will be created at `packages/db/data/agentmine.db`.

### 4. 開発サーバーの起動 / Start Development Servers

全パッケージを一括起動:

Start all packages:

```bash
pnpm dev
```

個別に起動する場合:

To start individual packages:

```bash
# daemon のみ / Daemon only
pnpm --filter @agentmine/daemon dev

# web のみ / Web only
pnpm --filter @agentmine/web dev
```

### 5. 動作確認 / Verify

| サービス / Service | URL | 説明 / Description |
|-------------------|-----|-------------------|
| Web UI | http://localhost:3000 | フロントエンド / Frontend |
| API | http://localhost:3001/api | バックエンドAPI / Backend API |

Web UIはAPIリクエストをdaemon（localhost:3001）に自動プロキシします。

The Web UI automatically proxies API requests to the daemon (localhost:3001).

---

## 方法B: Docker開発 / Option B: Docker

### 1. コンテナの起動 / Start Containers

```bash
docker compose up -d
```

### 2. 動作確認 / Verify

| サービス / Service | URL | 説明 / Description |
|-------------------|-----|-------------------|
| Web UI | http://localhost:3000 | フロントエンド / Frontend |
| API | http://localhost:3001/api | バックエンドAPI / Backend API |

### 3. ログの確認 / View Logs

```bash
docker compose logs -f
```

### 4. コンテナの停止 / Stop Containers

```bash
docker compose down
```

### Traefik連携 / Traefik Integration

リバースプロキシ（Traefik）と連携する場合は、`docker-compose.override.yml` を作成してTraefikラベルとネットワーク設定を追加してください。

To integrate with a reverse proxy (Traefik), create a `docker-compose.override.yml` to add Traefik labels and network configuration.

---

## よく使うコマンド / Common Commands

### 開発 / Development

```bash
pnpm dev                                    # 全パッケージ起動 / Start all
pnpm --filter @agentmine/daemon dev         # daemon単体 / Daemon only
pnpm --filter @agentmine/web dev            # web単体 / Web only
```

### ビルド / Build

```bash
pnpm build                                  # 全パッケージビルド / Build all
```

### データベース / Database

```bash
cd packages/db
pnpm generate                               # マイグレーション生成 / Generate migrations
pnpm migrate                                # マイグレーション実行 / Run migrations
pnpm studio                                 # Drizzle Studio起動 / Open Drizzle Studio
```

### Docker

```bash
docker compose up -d                        # 起動 / Start
docker compose down                         # 停止 / Stop
docker compose build                        # ビルド / Build
docker compose logs -f                      # ログ確認 / View logs
```

---

## トラブルシューティング / Troubleshooting

### `pnpm install` が失敗する / `pnpm install` fails

corepackが有効か確認してください:

Ensure corepack is enabled:

```bash
corepack enable
node -v   # v20以上であること / Must be v20+
```

### ポートが既に使用されている / Port already in use

3000番または3001番ポートが他のプロセスで使用されている場合:

If port 3000 or 3001 is already in use:

```bash
# macOS / Linux
lsof -i :3000
lsof -i :3001
```

### データベースエラー / Database errors

マイグレーションを再実行してください:

Re-run migrations:

```bash
cd packages/db
pnpm generate
pnpm migrate
```

### Docker Composeでネットワークエラー / Docker Compose network error

`docker-compose.override.yml` がある場合、外部ネットワーク（Traefik等）の存在が必要になることがあります。overrideファイルを一時的に退避して試してください。

If you have a `docker-compose.override.yml`, it may require external networks (e.g., Traefik). Try temporarily moving the override file aside.
