---
depends_on: []
tags: [appendix, glossary, terminology]
ai_summary: "ドメイン用語・技術用語・システム固有用語の定義と廃止用語の記録"
---

# 用語集

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、プロジェクトで使用する用語を定義する。

---

## 用語集の使い方

- 新しい用語は五十音順で配置する
- 略語は正式名称と併記する
- 初出時は「〇〇（→用語集）」と明示する

---

## ドメイン用語

| 用語 | 読み | 定義 |
|------|------|------|
| AgentMine | えーじぇんとまいん | AI並列開発の実行基盤と判断材料を提供するプロジェクト管理基盤 |
| Project | ぷろじぇくと | 1つのGitリポジトリを管理単位として登録したもの |
| Orchestrator | おーけすとれーたー | 人間とAIの境界で要件整理と判断を行うインターフェース |
| Planner/Scheduler | ぷらんなー/すけじゅーらー | タスク分解と依存・割当設計を担う役割 |
| タスク | たすく | 開発作業の単位。親子と依存を持つ |
| Run | らん | タスクに対する1回の実行記録。終了コードやログ等の事実を持つ |
| Agent Profile | えーじぇんとぷろふぁいる | runner/model/デフォルト除外/DoD等の実行設定 |
| Memory Bank | めもりーばんく | 判断材料として蓄積するプロジェクト知識 |

---

## 技術用語

| 用語 | 正式名称 | 定義 |
|------|----------|------|
| ADR | Architecture Decision Record | 重要な設計判断と理由を記録する文書 |
| API | Application Programming Interface | アプリケーション間のインターフェース |
| Authentication | Authentication | 利用者を識別する仕組み（MVPでは対象外） |
| Authorization | Authorization | 利用者が実行できる操作を制御する仕組み |
| C4 | C4 Model | ソフトウェア構造を表現する図法 |
| DoD | Definition of Done | 完了条件の検証基準 |
| MCP | Model Context Protocol | AIクライアント向けツール連携規格 |
| NFR | Non-Functional Requirements | 非機能要件（性能/信頼性/運用性等） |
| SSoT | Single Source of Truth | 正しい情報源を1つに定める設計原則 |
| Worktree | Git Worktree | 同一リポジトリの隔離作業領域 |
| SSE | Server-Sent Events | サーバ→クライアントの単方向イベント配信 |

---

## システム固有用語

| 用語 | 定義 | 関連 |
|------|------|------|
| AgentMine Home | AgentMineが管理データを置くホームディレクトリ（`~/.agentmine`） | scope.md |
| Local Daemon | ローカルで常駐し、API/イベント配信/実行基盤を提供するプロセス | structure.md |
| DBマスター | 状態のSSoTをDBに置く設計原則 | principles.md |
| 観測可能な事実 | AIの主観ではなく事実で状態を判定する原則 | principles.md |
| スコープ制御 | 物理的制約でアクセス範囲を限定する仕組み | principles.md |
| scope snapshot | run開始時点の有効スコープを保存したもの | data-model.md |
| Runner | AIを実行する手段（CLI/API等）の総称 | runner-adapter.md |
| RunnerAdapter | runner差を吸収するアダプタ | runner-adapter.md |
| log_ref | runログの参照文字列 | log-storage.md |
| output_ref | checkログの参照文字列 | log-storage.md |
| Worker | 隔離worktreeで実装するAI | structure.md |
| Planner/Scheduler | タスク分解と依存・割当を設計する役割 | flows.md |
| Reviewer | DoD検証を担うAI | flows.md |

---

## 非推奨用語

| 非推奨 | 推奨 | 理由 |
|--------|------|------|
| 完全自動AI開発 | 役割分離型AI開発 | 判断と実行の分離を明示するため |

---

## 関連ドキュメント

- [00-writing-guide.md](../00-writing-guide.md) - 記載規範
- [00-index.md](../00-index.md) - ドキュメントインデックス
