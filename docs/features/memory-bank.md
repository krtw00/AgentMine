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
│  次回セッション開始時にAIに渡す。                                   │
│                                                                     │
│  【保存形式】                                                        │
│  ファイルベースのみ（DBテーブルなし）                               │
│  → Gitで履歴管理可能、人間が直接編集可能                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 設計目標

1. **決定事項の永続化**: プロジェクトの「なぜ」を記録
2. **AIへの自動注入**: セッション開始時にコンテキストとして渡す
3. **人間可読**: Markdownで人間も確認・編集可能
4. **Git管理**: 変更履歴をGitで追跡可能
5. **シンプル**: DBとの同期複雑性を回避

## ディレクトリ構造

```
.agentmine/memory/
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

各決定事項は以下の形式のMarkdownファイル：

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
│    │ agentmine worker command <task-id>                             │
│    ▼                                                                │
│  agentmine                                                          │
│    │ 1. タスク情報取得                                              │
│    │ 2. Memory Bankファイル全件読み込み                             │
│    │ 3. プロンプト生成（Memory Bank + Task）                        │
│    ▼                                                                │
│  Worker起動コマンド出力                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 生成されるコンテキスト例

```markdown
## プロジェクト決定事項

### アーキテクチャ
- **データベース選定**: PostgreSQL（本番）、SQLite（ローカル）
  - 理由: pgvectorによるAI機能の親和性

### ツール
- **テストフレームワーク**: Vitest
  - 理由: 高速、Vite互換、Jest互換API

### ルール
- **テスト必須**: バグ修正時はregression testを追加すること

## タスク
**ログイン機能を実装**
POST /api/login でJWTトークンを返すAPIを実装してください。
```

## CLI

```bash
# 決定事項一覧
agentmine memory list
agentmine memory list --category architecture

# 決定事項追加（ファイル生成）
agentmine memory add \
  --category tooling \
  --title "テストフレームワーク" \
  --decision "Vitest" \
  --reason "高速、Vite互換"
# → .agentmine/memory/tooling/001-test-framework.md を生成

# 決定事項編集（エディタで開く or 直接編集）
agentmine memory edit tooling/001-test-framework.md

# 決定事項削除
agentmine memory remove tooling/001-test-framework.md

# コンテキストプレビュー（AIに渡される内容を確認）
agentmine memory preview
```

## API

### MemoryService

```typescript
export class MemoryService {
  private memoryDir: string;  // .agentmine/memory/

  // ファイル読み込み
  async listDecisions(category?: DecisionCategory): Promise<MemoryFile[]>;
  async readDecision(path: string): Promise<MemoryFile>;

  // ファイル書き込み
  async addDecision(decision: NewDecision): Promise<string>;  // 生成されたパスを返す
  async removeDecision(path: string): Promise<void>;

  // コンテキスト生成
  async buildContext(): Promise<string>;
}

interface MemoryFile {
  path: string;           // "architecture/001-database.md"
  category: string;
  title: string;
  decision: string;
  reason?: string;
  created: Date;
  updated?: Date;
}
```

### ファイル読み込み実装

```typescript
async listDecisions(category?: DecisionCategory): Promise<MemoryFile[]> {
  const categories = category
    ? [category]
    : ['architecture', 'tooling', 'convention', 'rule'];

  const files: MemoryFile[] = [];

  for (const cat of categories) {
    const dir = path.join(this.memoryDir, cat);
    if (!fs.existsSync(dir)) continue;

    const mdFiles = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
    for (const file of mdFiles) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const parsed = this.parseMarkdown(content);
      files.push({
        path: `${cat}/${file}`,
        category: cat,
        ...parsed,
      });
    }
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}
```

## MCP統合

```typescript
// MCP Tool: memory_list
{
  name: "memory_list",
  description: "List project decisions from Memory Bank files",
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
  description: "Add a project decision (creates markdown file)",
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

Memory Bankファイルは通常のソースコードと同様にGit管理される：

```bash
# 変更履歴の確認
git log --oneline .agentmine/memory/

# 差分確認
git diff .agentmine/memory/

# PRレビューで決定事項の変更も確認可能
```

## References

- [Data Model](../data-model.md)
- [Agent Execution](./agent-execution.md)
- [Session Log](./session-log.md)
