# ADR-004: 複数プロジェクト・単一DB

## Status

**Accepted** - 2025-01

## Context

agentmineで複数のGitHubリポジトリ（プロジェクト）を管理する際のアーキテクチャを決定する必要がある。

### 検討した選択肢

| 選択肢 | 概要 | メリット | デメリット |
|--------|------|----------|------------|
| **A: 1プロジェクト=1DB** | 各リポジトリに`.agentmine/data.db` | 完全隔離、シンプル | 横断管理不可、複数UI必要 |
| **B: 複数プロジェクト=1DB** | グローバルDBで全プロジェクト管理 | 横断分析、一元管理 | projectIdフィルタ必須 |

### ユースケース

開発者が複数のGitHubリポジトリを並列開発する場合：

```
# 選択肢A: プロジェクトごとに別々のagentmine
repo-A/.agentmine/data.db → Web UI :3001
repo-B/.agentmine/data.db → Web UI :3002
repo-C/.agentmine/data.db → Web UI :3003
↑ 管理コストが高い

# 選択肢B: 単一DBで全プロジェクト管理
~/.agentmine/data.db → Web UI :3000 (全プロジェクト横断)
↑ 一元管理可能
```

## Decision

**B: 複数プロジェクト=単一DB** を採用する。

### DB配置

```
~/.agentmine/
├── config.yaml          # グローバル設定
├── data.db              # SQLite（デフォルト）
└── cache/               # プロジェクトメタデータキャッシュ

# PostgreSQL使用時
AGENTMINE_DATABASE_URL=postgres://user:pass@host:5432/agentmine
```

### データベース選択

| 用途 | データベース | 設定 |
|------|-------------|------|
| 個人利用（デフォルト） | SQLite | `~/.agentmine/data.db` |
| チーム利用 | PostgreSQL | 環境変数 `AGENTMINE_DATABASE_URL` |

## Rationale

### 1. 管理コストの削減

複数プロジェクトを1つのWeb UIで確認できる：

```
┌─────────────────────────────────────────────┐
│ agentmine Dashboard                         │
├─────────────────────────────────────────────┤
│ Projects: [All] [repo-A] [repo-B] [repo-C]  │
├─────────────────────────────────────────────┤
│ Tasks across all projects:                  │
│ - #1 (repo-A) 認証機能実装      [進行中]    │
│ - #2 (repo-B) バグ修正          [完了]      │
│ - #3 (repo-C) リファクタリング  [待機中]    │
└─────────────────────────────────────────────┘
```

### 2. Redmine的運用との整合性

agentmineの設計思想「Redmine的運用」に合致：

- Redmine: 1インスタンス = 複数プロジェクト
- agentmine: 1DB = 複数プロジェクト

### 3. SQLite/PostgreSQL両対応

Drizzle ORM（ADR-003）により、接続先の切り替えが容易：

```typescript
const db = process.env.AGENTMINE_DATABASE_URL
  ? createPostgresClient(process.env.AGENTMINE_DATABASE_URL)
  : createSqliteClient(path.join(os.homedir(), '.agentmine', 'data.db'))
```

### 4. スキーマの対応

現在のスキーマは既に `projectId` を持っている：

```typescript
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  // ...
})
```

## Consequences

### Positive

- 複数プロジェクトを単一UIで管理可能
- プロジェクト横断の分析・レポートが可能
- セットアップがシンプル（グローバルDB自動作成）
- 個人利用はSQLite、チーム利用はPostgreSQLと使い分け可能

### Negative

- 全クエリで `projectId` フィルタが必要
- プロジェクト間のデータ分離は論理的（物理的ではない）
- グローバルDBの破損は全プロジェクトに影響

### Risks

- SQLiteの同時アクセス制限（単一ユーザーなら問題なし）
- DBファイルサイズの肥大化（長期運用時）

## Implementation

### Phase 1: グローバルDB対応

1. DB配置を `~/.agentmine/data.db` に変更
2. `agentmine project add <path>` コマンド追加
3. 全クエリに `projectId` フィルタ追加

### Phase 2: Web UI対応

1. プロジェクト選択UI追加
2. プロジェクト横断ダッシュボード
3. プロジェクトフィルタ機能

### Phase 3: PostgreSQL対応

1. 環境変数による接続先切り替え
2. PostgreSQLスキーマ生成
3. マイグレーション対応

## References

- ADR-002: SQLite as Default Database
- ADR-003: Drizzle ORM
