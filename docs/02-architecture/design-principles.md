# 設計原則

agentmineの6つの中核となる設計原則。すべての機能・実装はこれらの原則に従います。

---

## 原則一覧

1. **Single Source of Truth (DBマスター)**
2. **Collaborative by Design (Redmine的運用)**
3. **AI as Orchestrator**
4. **Isolation & Safety**
5. **Observable & Deterministic**
6. **Fail Fast**

---

## 1. Single Source of Truth (DBマスター)

### 原則

**すべてのデータ（タスク、Agent、Memory、設定）はDBで管理する。**

ファイルはスナップショット/エクスポート用のみ。`.agentmine/`ディレクトリはデフォルトでgitignore。

### 理由

- **データ整合性**: 複数箇所に同じ情報を持たない
- **リアルタイム共有**: チーム全員が常に最新データを参照
- **変更履歴**: DB側でバージョン管理（history テーブル）
- **検索・フィルタリング**: SQL/ORMで効率的なクエリ

### データフロー

```
┌─────────────────────────────────────────────────────────────────┐
│  Single Source of Truth = DB                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Web UI ──┐                                                      │
│  CLI ─────┼──→ DB (マスター) ──→ Worker用スナップショット出力   │
│  MCP ─────┘                                                      │
│                                                                 │
│  .agentmine/ は .gitignore（リポジトリには含めない）            │
└─────────────────────────────────────────────────────────────────┘
```

### DB管理されるデータ

| データ | テーブル | スナップショット出力先 |
|--------|---------|---------------------|
| タスク | `tasks` | - |
| セッション | `sessions` | - |
| Agent定義 | `agents` | `.agentmine/agents/*.yaml` |
| Memory Bank | `memories` | `worktree/.agentmine/memory/` |
| 設定 | `settings` | `.agentmine/config.yaml` |
| 監査ログ | `audit_logs` | - |

### 詳細

🔗 @../03-core-concepts/db-master.md

---

## 2. Collaborative by Design (Redmine的運用)

### 原則

**チーム全員が同じDBを参照し、リアルタイムで協業する。**

複数人（人間 + AI）が共有PostgreSQLを見ながら、並列で作業できる。

### 理由

- **チーム協業**: Redmineのように全員が同じプロジェクト情報を共有
- **リアルタイム性**: 他の人の作業状況が即座に反映
- **競合回避**: DBトランザクション・排他制御で安全

### アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│  Redmine的運用                                                   │
│                                                                 │
│  チーム全員 ───→ 共有PostgreSQL ───→ 単一の真実源               │
│                                                                 │
│  Human A ──┐                                                     │
│  Human B ──┼──→ Web UI ──┐                                       │
│  Orchestrator ──→ CLI ──┼──→ DB (マスター) ──→ Worker           │
│                         └──→ MCP ─────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

### DB戦略

| 環境 | DB | 用途 |
|------|-----|------|
| **チーム開発（メイン）** | **PostgreSQL** | 共有DB、Redmine的運用、リアルタイム協業 |
| ローカル開発（サブ） | SQLite | 個人利用、お試し、オフライン |

🔗 @../04-data/overview.md

---

## 3. AI as Orchestrator

### 原則

**計画・判断はAI、agentmineは実行基盤・記録・提供のみ担当する。**

agentmineは並列実行を「計画」しない。Orchestratorが「計画」し、agentmineは実行基盤を提供する。

### 理由

- **柔軟性**: AIが状況に応じて最適な並列実行戦略を選択
- **責務分離**: agentmineはツール・実行基盤に徹する
- **拡張性**: Orchestratorの能力向上がそのまま恩恵に

### 責務分担

```
┌─────────────────────────────────────────────────────────────────┐
│  AI as Orchestrator                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Orchestrator（AIクライアント）の責務:                            │
│  - 並列実行の計画（何を並列にするか）                             │
│  - `agentmine worker run --exec --detach` の実行                  │
│  - 進捗監視（worker status / wait）                              │
│  - 結果マージ（コンフリクト解決、マージ実行）                     │
│  - PR作成                                                        │
├─────────────────────────────────────────────────────────────────┤
│  agentmineの責務:                                                 │
│  - worktree作成/削除（git worktreeを内部実行）                     │
│  - スコープ適用（sparse-checkout + chmod）                        │
│  - Worker起動/プロンプト生成（worker run/prompt）                 │
│  - セッション記録（exit code, artifacts等）                       │
│  - Memory Bank提供                                                │
│                                                                  │
│  ※ Workerはagentmineにアクセスしない                             │
└─────────────────────────────────────────────────────────────────┘
```

### 詳細

🔗 @../03-core-concepts/orchestrator-worker.md

---

## 4. Isolation & Safety

### 原則

**Worker隔離（worktree） + スコープ制御（sparse-checkout + chmod）で安全性を確保する。**

各Workerは独立したworktreeで作業し、物理的にアクセスできるファイルを制限する。

### 理由

- **並列実行の安全性**: Workerが互いに干渉しない
- **スコープ制御**: 意図しないファイルへのアクセスを防止
- **自動承認モード**: 安全性が保証されるため、AIに自動承認で実行させられる

### 隔離メカニズム

```
┌──────────────────────────────────────────────────────────────┐
│  Host                                                        │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Worktree       │  │   Worktree       │                 │
│  │   Task #3        │  │   Task #4        │                 │
│  │   ┌──────────┐   │  │   ┌──────────┐   │                 │
│  │   │ Worker   │   │  │   │ Worker   │   │                 │
│  │   └──────────┘   │  │   └──────────┘   │                 │
│  │   scope適用済    │  │   scope適用済    │                 │
│  └──────────────────┘  └──────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

### スコープ制御

| フィールド | 説明 | 物理的実装 |
|-----------|------|-----------|
| `exclude` | アクセス不可 | sparse-checkoutで除外（存在しない） |
| `read` | 参照可能 | worktreeに存在 |
| `write` | 編集可能 | 明示的に指定されたファイルのみ |

**優先順位**: `exclude` → `read` → `write`

### 事後チェック

agentmineはWorker完了時に`git diff`でスコープ違反を検出。

🔗 @../03-core-concepts/scope-control.md
🔗 @../05-features/worktree-scope.md

---

## 5. Observable & Deterministic

### 原則

**ステータスはexit code、merge状態等の客観事実で判定する。**

人間やAIが主観的に「完了」と設定するのではなく、観測可能な事実に基づいて自動判定。

### 理由

- **一貫性**: 誰が見ても同じ結果
- **自動化**: 人間の介入なしに判定可能
- **信頼性**: 事実ベースなので改ざん不可

### 観測可能な事実の例

| 対象 | 観測方法 | 判定 |
|------|---------|------|
| Worker終了 | `exit code` | 0=成功、1-6=エラー |
| タスク完了 | `git log baseBranch..task-branch` | 空=マージ済み（done） |
| セッション状態 | プロセス存在確認 | 存在=running、不存在=completed/failed |
| DoD判定 | マージ結果 | merged/timeout/error |

### タスクステータス判定（例）

```bash
# セッションのブランチがbaseBranchにマージされたか確認
git log --oneline baseBranch..session-branch

# 結果が空 → task-15-s123 の変更はmainに取り込まれている → done
# 結果があり → まだマージされていない → in_progress
```

### 詳細

🔗 @../03-core-concepts/observable-facts.md

---

## 6. Fail Fast

### 原則

**エラーは即座に失敗させ、リカバリーは上位層（Orchestrator）の責務とする。**

agentmineは中途半端な状態を作らず、エラー時は即座に失敗。リトライ判断はOrchestratorが行う。

### 理由

- **明確な状態**: 成功か失敗か、曖昧な状態なし
- **責務分離**: agentmineは実行基盤、リカバリーはOrchestratorの仕事
- **デバッグ容易**: エラー原因が明確

### エラーハンドリングの流れ

```
Worker失敗（exit code ≠ 0）
  │
  ▼
agentmine: セッションを failed に記録（即座に失敗）
  │
  ▼
Orchestrator: エラーログ確認
  │
  ├─→ リトライ判断（修正が必要か？）
  ├─→ タスク再実行（agentmine worker run）
  └─→ 人間に通知
```

### agentmineがやらないこと

- ❌ 自動リトライ
- ❌ エラーの自動修正
- ❌ 状態のロールバック

### Orchestratorがやること

- ✅ エラー分析
- ✅ リトライ判断
- ✅ 修正指示
- ✅ 人間へのエスカレーション

🔗 @../05-features/error-handling.md

---

## 原則間の関係

これら6つの原則は互いに補完し合います：

```
Single Source of Truth ──→ データ整合性を保証
         ↓
Collaborative by Design ──→ チームでの共有基盤
         ↓
AI as Orchestrator ──────→ 柔軟な並列実行
         ↓
Isolation & Safety ──────→ 安全な並列実行
         ↓
Observable & Deterministic → 信頼できる状態管理
         ↓
Fail Fast ───────────────→ 明確なエラーハンドリング
```

---

## 設計決定の確認

新しい機能を追加・設計する際は、これら6原則に照らし合わせて確認してください：

- [ ] DBマスターに従っているか？（ファイルではなくDBで管理）
- [ ] Collaborative by Designか？（チームで共有可能）
- [ ] AI as Orchestratorか？（agentmineは判断しない）
- [ ] Isolation & Safetyか？（Worker隔離、スコープ制御）
- [ ] Observable & Deterministicか？（客観的に判定可能）
- [ ] Fail Fastか？（エラー時は即座に失敗）

---

## 関連ドキュメント

- @../03-core-concepts/ - 各原則の詳細説明
- @../10-decisions/ - アーキテクチャ決定記録（ADR）
- @./overview.md - システム全体像
