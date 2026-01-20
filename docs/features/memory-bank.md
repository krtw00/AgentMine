# Memory Bank

プロジェクト決定事項を永続化し、AIエージェントに知識として渡す機能。

## 概要

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Memory Bank とは                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【解決する問題】                                                    │
│  AIエージェントはセッション終了時に全てを忘れる。                    │
│  「DBはPostgreSQL」「認証はJWT」などの決定事項が失われる。          │
│                                                                     │
│  【Memory Bankの役割】                                               │
│  プロジェクトの決定事項・ルールを保存し、                           │
│  次回セッション開始時に参照情報をAIに渡す。                         │
│                                                                     │
│  【保存形式】                                                        │
│  DBマスター（memoriesテーブル）                                      │
│  → ファイルはスナップショット/エクスポート用                         │
│  → `.agentmine/` はデフォルトでgitignore                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 設計目標

1. **決定事項の永続化**: プロジェクトの「なぜ」を記録
2. **AIへの自動注入**: 参照情報（ファイル一覧）を自動提示
3. **人間可読**: Markdownで人間も確認・編集可能
4. **エクスポート対応**: 必要時にファイルへ出力し、Git管理可能
5. **一貫性**: DBを単一の真実源にして同期問題を回避

## スナップショット出力

Worker起動時やエクスポート時に、DBからスナップショットを生成する。
`.agentmine/` はデフォルトでgitignoreされるため、必要ならエクスポート先を別ディレクトリにする。

```
.agentmine/memory/           # DBから生成されるスナップショット
├── architecture/           # アーキテクチャ決定
│   ├── 001-database.md
│   └── 002-monorepo.md
├── tooling/                # ツール選定
│   ├── 001-test-framework.md
│   └── 002-linter.md
├── convention/             # 規約
│   └── 001-commit-format.md
└── rule/                   # ルール（必須事項）
    └── 001-test-required.md
```

## ファイル形式

各決定事項は以下の形式のMarkdownファイル（スナップショット）：

```markdown
---
title: データベース選定
category: architecture
created: 2024-01-20
updated: 2024-01-25
---

# データベース選定

## 決定

PostgreSQL（本番）、SQLite（ローカル）

## 理由

- pgvectorによるAI機能の親和性
- SQLiteはゼロ設定でローカル開発に最適
- Drizzle ORMで両方をサポート可能
```

## カテゴリ

| カテゴリ | 説明 | 例 |
|---------|------|-----|
| `architecture` | アーキテクチャ | DB、フレームワーク、API設計 |
| `tooling` | ツール選定 | テスト、リンター、ビルドツール |
| `convention` | 規約 | コーディングスタイル、命名規則 |
| `rule` | ルール | 必須事項、禁止事項 |

## コンテキスト注入

### 注入タイミング

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Memory Bank 注入タイミング                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Orchestrator                                                       │
│    │                                                                │
│    │ agentmine worker run <task-id> [--exec]                        │
│    ▼                                                                │
│  agentmine                                                          │
│    │ 1. タスク情報取得                                              │
│    │ 2. DBからMemory Bank取得                                       │
│    │ 3. 必要に応じてスナップショット出力                            │
│    │ 4. プロンプト生成（Memory Bank参照情報 + Task）                │
│    ▼                                                                │
│  Worker起動コマンド出力/実行                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 生成されるコンテキスト例

（DBに保存された決定事項の参照情報を注入する例）

```markdown
## Project Context (Memory Bank)
The following project decision files are available:
- .agentmine/memory/architecture/001-database.md - データベース選定
- .agentmine/memory/tooling/001-test-framework.md - テストフレームワーク
- .agentmine/memory/rule/001-test-required.md - テスト必須

Read these files in .agentmine/memory/ for details.

## タスク
**ログイン機能を実装**
POST /api/login でJWTトークンを返すAPIを実装してください。
```

**Note:** デフォルトは参照のみ。内容を直接注入したい場合は、Orchestratorが要約してプロンプトに追加する。

## CLI

```bash
# 決定事項一覧
agentmine memory list
agentmine memory list --category architecture

# 決定事項追加（DBに保存）
agentmine memory add \
  --category tooling \
  --title "テストフレームワーク" \
  --decision "Vitest" \
  --reason "高速、Vite互換"

# 決定事項編集（DBを更新）
agentmine memory edit <id>

# 決定事項削除（DBから削除）
agentmine memory remove <id>

# コンテキストプレビュー（AIに渡される内容を確認）
agentmine memory preview

# スナップショット出力（バックアップ/共有用）
agentmine memory export --output ./memory/

# スナップショットのインポート（移行用）
agentmine memory import --dir ./memory/
```

## API

### MemoryService

```typescript
export class MemoryService {
  // DB読み込み
  async listDecisions(category?: DecisionCategory): Promise<MemoryRecord[]>;
  async getDecision(id: number): Promise<MemoryRecord | null>;

  // DB書き込み
  async addDecision(decision: NewDecision): Promise<MemoryRecord>;
  async updateDecision(id: number, input: UpdateDecision): Promise<MemoryRecord>;
  async removeDecision(id: number): Promise<void>;

  // コンテキスト生成
  async buildContext(): Promise<string>;

  // スナップショット
  async exportSnapshot(outputDir: string): Promise<void>;
  async importSnapshot(inputDir: string): Promise<void>;
}

interface MemoryRecord {
  id: number;
  category: string;
  title: string;
  decision: string;
  reason?: string;
  created: Date;
  updated?: Date;
}
```

## MCP統合

```typescript
// MCP Tool: memory_list
{
  name: "memory_list",
  description: "List project decisions from Memory Bank (DB)",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["architecture", "tooling", "convention", "rule"]
      },
    },
  },
}

// MCP Tool: memory_add
{
  name: "memory_add",
  description: "Add a project decision to Memory Bank (DB)",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", required: true },
      title: { type: "string", required: true },
      decision: { type: "string", required: true },
      reason: { type: "string" },
    },
  },
}

// MCP Tool: memory_preview
{
  name: "memory_preview",
  description: "Preview the context that will be passed to Workers",
  inputSchema: { type: "object", properties: {} },
}
```

## Git連携

DBがマスター。必要時にスナップショットをエクスポートしてGit管理する：

```bash
# エクスポート
agentmine memory export --output ./memory/

# 変更履歴の確認
git log --oneline ./memory/

# 差分確認
git diff ./memory/

# PRレビューで決定事項の変更も確認可能
```

## References

- [Data Model](../data-model.md)
- [Agent Execution](./agent-execution.md)
- [Session Log](./session-log.md)
