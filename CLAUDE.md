# AgentMine - Claude Code設定

## プロジェクト概要

AI作業実行プラットフォーム。DBをSSoT（Single Source of Truth）とし、観測可能な事実から状態を導出する。

## モノレポ構成

```
packages/
├── daemon/   # Hono API (port 3001)
├── web/      # Next.js (port 3000)
├── shared/   # 共通型定義
└── db/       # Drizzle ORM + SQLite
```

## よく使うコマンド

```bash
# 開発
pnpm dev              # 全パッケージ起動
pnpm --filter @agentmine/daemon dev   # daemon単体
pnpm --filter @agentmine/web dev      # web単体

# ビルド
pnpm build

# DB
cd packages/db
pnpm generate         # マイグレーション生成
pnpm migrate          # マイグレーション実行
pnpm studio           # Drizzle Studio

# Docker
docker compose up -d              # 起動
docker compose down               # 停止
docker compose build              # ビルド
docker compose logs -f            # ログ
```

## Docker構成

```
┌─────────────────────────────────────────┐
│              Traefik (:80)              │
│         (リバースプロキシ)               │
├─────────────────────────────────────────┤
│  /api/* → daemon:3001                   │
│  /*     → web:3000                      │
└─────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌────┴────┐
    │ daemon  │          │   web   │
    │  :3001  │          │  :3000  │
    └─────────┘          └─────────┘
         │
    ┌────┴────┐
    │ SQLite  │
    │ (volume)│
    └─────────┘
```

## API

| エンドポイント | 説明 |
|---------------|------|
| GET /api/projects | Project一覧 |
| POST /api/projects | Project作成 |
| GET /api/projects/:id/tasks | Task一覧 |
| POST /api/projects/:id/tasks | Task作成 |
| GET /api/projects/:id/agent-profiles | Profile一覧 |
| POST /api/tasks/:id/runs | Run開始 |
| POST /api/runs/:id/stop | Run停止 |
| GET /api/events | SSE |

## 技術スタック

- **Frontend**: Next.js 15, React 19, Tailwind CSS 4, TanStack Query, Zustand
- **Backend**: Hono, Drizzle ORM, libsql (SQLite)
- **Infra**: Docker, Traefik
- **Tools**: pnpm, Turborepo, tsup, Vitest

## 設計ドキュメント

- `docs/00-index.md` - 設計入口
- `docs/03-details/api.md` - API仕様
- `docs/03-details/ui-mvp.md` - UI仕様
