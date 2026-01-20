# DevHive → agentmine Migration Guide

## Overview

[DevHive](https://github.com/krtw00/devhive)の機能はagentmineに統合されます。このドキュメントでは移行方法と機能対応を説明します。

## Why Migrate?

### DevHiveの限界

| 項目 | DevHive | 課題 |
|------|---------|------|
| **セキュリティ** | なし | 機密ファイルにアクセス可能 |
| **チーム協業** | 個人開発のみ | 状態共有不可 |
| **知識管理** | なし | プロジェクト知識が散逸 |
| **UI** | CLIのみ | 可視化が困難 |

### agentmineの利点

| 項目 | agentmine | メリット |
|------|-----------|---------|
| **セキュリティ** | スコープ制御 | sparse-checkout + chmod |
| **チーム協業** | 共有PostgreSQL | リアルタイム状態共有 |
| **知識管理** | Memory Bank | プロジェクト知識を永続化 |
| **UI** | Web UI + CLI + MCP | 多様なインターフェース |

---

## Feature Mapping

### 基本コマンド

| DevHive | agentmine | Status |
|---------|-----------|--------|
| `devhive init` | `agentmine init` | ✅ 実装予定 |
| `devhive up` | `agentmine worker run <id> --exec --detach` | ✅ Phase 1 |
| `devhive down` | `agentmine worker done <id>` | ✅ Phase 1 |
| `devhive ps` | `agentmine worker status` | ✅ Phase 1 |
| `devhive logs` | `agentmine worker logs <id>` | ⏳ Phase 4 |
| `devhive status` | `agentmine status` | ⏳ Phase 4 |

### ユーティリティ

| DevHive | agentmine | Status |
|---------|-----------|--------|
| `devhive progress <w> <n>` | `agentmine worker monitor <id>` | ⏳ Phase 4（自動推測） |
| `devhive merge <w> <br>` | `agentmine worker done <id>` | ✅ Phase 1（自動マージ） |
| `devhive diff [w]` | `agentmine worker diff <id>` | ⏳ Phase 4 |
| `devhive note <w> "msg"` | `agentmine worker note <id> "msg"` | ⏳ Phase 4 |
| `devhive clean` | `agentmine worker clean` | ⏳ Phase 4 |

### 通信機能

| DevHive | agentmine | Status |
|---------|-----------|--------|
| `devhive request help` | `agentmine worker monitor` | ⏳ Phase 4（自動検出） |
| `devhive report "msg"` | 不要 | Observable Factsで代替 |
| `devhive msgs` | `agentmine notifications` | ⏳ Phase 4 |
| `devhive inbox` | `agentmine inbox` | ⏳ Phase 4 |
| `devhive reply <w>` | `agentmine worker hint <id>` | ⏳ Phase 4 |

---

## Migration Strategy

### Phase 1: 共存期間（2026-01 〜 2026-06）

**推奨**: DevHiveとagentmineを並行利用

```bash
# 個人開発・プロトタイピング: DevHive
cd my-prototype
devhive up

# チーム開発・本番: agentmine
cd my-production
agentmine worker run 1 --exec
```

**理由**:
- agentmineのPhase 1-3完了を待つ
- DevHiveはシンプルで高速

### Phase 2: 段階的移行（2026-07 〜 2026-09）

**Phase 4完了後**: DevHive機能が全てagentmineに統合

```bash
# DevHiveプロジェクトをagentmineに移行
agentmine migrate --from-devhive .devhive.yaml
```

**移行内容**:
1. `.devhive.yaml` → agentmine DB（tasks, agents）
2. `.devhive/worktrees/` → `.agentmine/worktrees/`
3. `.devhive/roles/` → agentmine agents
4. `.devhive/tasks/` → agentmine tasks

### Phase 3: DevHive終了（2026-10 〜）

**Status**: DevHiveは保守モードへ

- 新機能開発停止
- バグ修正のみ継続
- agentmineへの完全移行を推奨

---

## Configuration Comparison

### DevHive設定

```yaml
# .devhive.yaml
workers:
  frontend:
    branch: feat/ui
    role: "@frontend"
    task: "フロントエンド実装"
    tool: claude

  backend:
    branch: feat/api
    role: "@backend"
    task: "API実装"
    tool: codex
```

### agentmine設定

```yaml
# Agent定義（DB管理 or .agentmine/agents/frontend.yaml）
name: frontend
client: claude-code
model: sonnet
scope:
  exclude:
    - "**/*.env"
    - "**/node_modules/**"
  write:
    - "src/frontend/**"
    - "tests/frontend/**"
```

```bash
# タスク作成（CLI or Web UI）
agentmine task add "フロントエンド実装" \
  --agent frontend \
  --branch feat/ui

# Worker起動
agentmine worker run 1 --exec --detach
```

**違い**:
- DevHive: YAMLで一元管理
- agentmine: DB（tasks, agents）+ CLI/Web UI

---

## Key Differences

### 1. セキュリティ

**DevHive**: スコープ制御なし

```bash
# すべてのファイルにアクセス可能
devhive up  # → .env, secrets/ も見える
```

**agentmine**: スコープ制御

```yaml
scope:
  exclude:
    - "**/*.env"     # 物理的に除外
    - "**/secrets/**"
```

### 2. 状態管理

**DevHive**: ローカルSQLite

```
.devhive/devhive.db  # 各プロジェクト個別
```

**agentmine**: PostgreSQL/SQLite

```bash
# チーム共有（PostgreSQL）
export AGENTMINE_DB_URL="postgres://user:pass@host/db"

# ローカル（SQLite）
export AGENTMINE_DB_URL="sqlite://.agentmine/data.db"
```

### 3. 進捗管理

**DevHive**: AIが自主報告

```bash
# Workerが実行（忘れる可能性）
devhive report "50%完了"
```

**agentmine**: Observable Facts

```bash
# Orchestratorが監視（確実）
agentmine worker monitor 1
# Git状態、セッションログから自動推測
```

### 4. インターフェース

**DevHive**: CLIのみ

```bash
devhive ps  # ターミナル出力のみ
```

**agentmine**: マルチインターフェース

```bash
agentmine worker status  # CLI
# http://localhost:3000  # Web UI
# Cursor → MCP Server    # IDE統合
```

---

## Migration Timeline

```
2026-01  ○ DevHive v1.0 (current)
         ├─ agentmine Phase 0 開始
         │
2026-03  ├─ agentmine Phase 1 完了
         │  （基本CLI動作可能）
         │
2026-05  ├─ agentmine Phase 2-3 完了
         │  （Web UI + MCP）
         │
2026-07  ├─ agentmine Phase 4 完了
         │  （DevHive機能統合）
         ├─ 移行推奨開始
         │
2026-10  ◉ DevHive保守モード移行
         └─ agentmine完全移行
```

---

## FAQ

### Q1: DevHiveプロジェクトはどうなる？

**A**: 保守モードに移行。バグ修正のみ継続、新機能開発はagentmineで。

### Q2: 既存の.devhive/データは使える？

**A**: Phase 4で`agentmine migrate`コマンドを提供予定。自動移行可能。

### Q3: DevHiveの方がシンプルでは？

**A**: 個人開発・プロトタイピングにはDevHiveも継続利用可能。チーム開発・本番環境ではagentmine推奨。

### Q4: 移行は必須？

**A**: いいえ。DevHiveは保守継続。ただしセキュリティ・チーム協業が必要ならagentmine推奨。

### Q5: 移行コストは？

**A**: Phase 4で自動移行ツール提供予定。手動移行も.devhive.yaml → CLI/Web UIで可能。

---

## Getting Help

- **GitHub Issues**: https://github.com/krtw00/agentmine/issues
- **DevHive Issues**: https://github.com/krtw00/devhive/issues
- **Documentation**: @../00-INDEX.md

---

## Related Documents

- @./overview.md - agentmine概要
- @./roadmap.md - ロードマップ
- @../02-architecture/architecture.md - アーキテクチャ詳細
- @../07-runtime/worker-lifecycle.md - Worker実行フロー
