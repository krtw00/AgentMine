---
depends_on:
  - ../02-architecture/principles.md
  - ../04-decisions/0009-runner-adapter-interface.md
  - ../03-details/scope-control.md
tags: [decisions, adr, repositioning, strategy, differentiation]
ai_summary: "Claude Code Agent Teams登場に伴うAgentMineの方向転換決定。AI非依存+安全性・監査+チーム向けへのリポジショニング"
---

# ADR-0013: リポジショニング（AI非依存・安全性・チーム向け）

> Status: Accepted
> 最終更新: 2026-02-06

## コンテキスト

2026年2月、AnthropicがClaude Opus 4.6と同時にClaude Codeの**Agent Teams**機能を発表した。Agent Teamsは複数のClaude Codeインスタンスを並列実行し、自律的に連携する仕組みである。

AgentMineが提供してきた「AIの並列オーケストレーション」はClaude Codeのネイティブ機能と重複する。このまま同一路線で開発を続けても、Claude Codeのエコシステム優位性に勝てない。

AgentMineの既存設計を精査した結果、Claude Codeが**持たない強み**が複数確認された。

| AgentMineの既存資産                              | Claude Codeの対応          |
| ------------------------------------------------ | -------------------------- |
| RunnerAdapter（AI非依存）                        | Claude専用                 |
| write_scope + scope violation + 承認ワークフロー | ツール単位の権限モードのみ |
| worktree物理隔離                                 | 同一ディレクトリで動作     |
| Observable Facts + 状態導出                      | AIの自己報告に依存         |
| DoD（定義に基づく完了判定）                      | 形式的な完了定義なし       |
| Web UI（監視・介入・共有）                       | ターミナル完結             |

## 決定事項

AgentMineの方向性を以下3軸で再定義する。

### A. AI非依存オーケストレーション

RunnerAdapter設計を核に、Claude/Codex/Gemini等の複数AI Runnerを統合管理するプラットフォームとする。Claude Codeは「優秀なRunner」の一つとして位置づける。

### B. 安全性・監査レイヤー

スコープ制御、DoD、Observable Facts、違反追跡を強化し、AIの実行に対する安全性と監査可能性を提供する。具体的な追加機能:

| 機能                     | 概要                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Proof-Carrying Run       | Run完了時に変更の証跡パック（prompt hash、scope snapshot、changed files、DoD結果、承認履歴）を自動生成する |
| Conflict-Aware Scheduler | 並列起動前にwrite_scopeの重なりを検出し、衝突を回避する実行順を決定する                                    |
| Memory Governance        | 記憶に信頼度・有効期限・承認を追加し、記憶汚染を防ぐ                                                       |

### D. チーム/組織向け（Phase 3）

認証・権限管理を追加し、チームでの共有利用に対応する。Web UIの可視性を活かし、Claude Codeの「個人ターミナル」では実現できない組織運用を提供する。

## 採用した追加機能の評価

| #   | 機能                     | Phase | 既存設計との整合                                              | 差別化効果 |
| --- | ------------------------ | ----- | ------------------------------------------------------------- | ---------- |
| F   | Proof-Carrying Run       | 1     | scope_snapshot, dod_snapshot, log_ref等が既存。バンドル化のみ | 中〜高     |
| G   | Conflict-Aware Scheduler | 1     | write_scope必須(ADR-0006)の自然な拡張                         | 高         |
| K   | Memory Governance        | 1     | memory-layer.mdの将来拡張に記載済み                           | 中         |
| I   | Cost/SLA Router          | 2     | agent_profilesのrunner/model選択の知的拡張                    | 高         |
| L   | Compliance Templates     | 2-3   | settings+scope+DoDの組み合わせで実現可能                      | 中〜高     |

## 保留・不採用とした機能

| #   | 機能               | 判定   | 理由                                                                |
| --- | ------------------ | ------ | ------------------------------------------------------------------- |
| E   | Just-in-Time Scope | 保留   | 非対話Runner(ADR-0005)との矛盾。既存のretryフローで擬似的に実現可能 |
| H   | Spec Contract Mode | 不採用 | コード意味解析が必要で、現アーキテクチャのスコープ外                |
| J   | Forensic Replay    | 保留   | 優先度低。再現性原則の運用で部分的に対応可能                        |

## 検討した選択肢

### 選択肢1: Claude Codeと同一路線で競合（不採用）

| 項目       | 内容                                              |
| ---------- | ------------------------------------------------- |
| 概要       | オーケストレーション機能をそのまま拡充する        |
| メリット   | 方向転換コストなし                                |
| デメリット | Claude Codeのエコシステム・ユーザー基盤に勝てない |

### 選択肢2: AI非依存+安全性+チーム向けへ転換（採用）

| 項目       | 内容                                           |
| ---------- | ---------------------------------------------- |
| 概要       | Claude Codeが持たない強みに集中する            |
| メリット   | 明確な差別化、既存設計資産の活用               |
| デメリット | ポジショニング変更に伴うドキュメント更新コスト |

### 選択肢3: Claude Code補完ツールに特化

| 項目       | 内容                                      |
| ---------- | ----------------------------------------- |
| 概要       | Claude Code専用の管理レイヤーとして特化   |
| メリット   | Claude Codeユーザーを直接取り込める       |
| デメリット | Claude Codeに依存し、AI非依存の強みを失う |

## 決定理由

**選択肢2**を採用した理由:

- 既存設計（RunnerAdapter, scope-control, DoD, Observable Facts）が新方向性と矛盾しない
- 実装済みコードの変更はゼロ。ドキュメント更新と未実装部分の完成で対応可能
- AI市場のマルチモデル化の流れに合致する
- Claude Codeとは「競合」ではなく「補完」の関係を構築できる

## 結果

### ポジティブな影響

- Claude Codeとの差別化が明確になる
- 既存設計資産を無駄にせず活用できる
- エンタープライズ市場への訴求が可能になる

### ネガティブな影響

- ドキュメント全体の更新が必要
- 複数Runner対応の実装・テスト負荷が増える
- チーム向け機能（認証・権限）は新規設計が必要

## 関連ADR

- [ADR-0006](./0006-task-write-scope-required.md) - write_scope必須（Conflict-Aware Schedulerの前提）
- [ADR-0009](./0009-runner-adapter-interface.md) - RunnerAdapter I/F（AI非依存の基盤）
- [ADR-0012](./0012-memory-layer.md) - 記憶層（Memory Governanceの前提）

## 関連ドキュメント

- [プロジェクト概要](../01-overview/summary.md) - リポジショニングの反映先
- [スコープ](../01-overview/scope.md) - フェーズ計画の再構成先
- [スコープ制御](../03-details/scope-control.md) - 安全性レイヤーの既存設計
- [RunnerAdapter](../03-details/runner-adapter.md) - AI非依存の基盤設計
