---
depends_on:
  - ./data-model.md
  - ./scope-control.md
  - ./runner-adapter.md
  - ./log-storage.md
  - ../02-architecture/role-model.md
tags: [details, agents, profiles, prompts, execution]
ai_summary: "Agent Profile（runner/model/prompt/デフォルトスコープ等）の定義と、run開始時の適用（prompt・スコープ合成・監査）を定義"
---

# Agent Profiles

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、run実行時の設定単位であるAgent Profileを定義する。
Agent Profileは役割モデル上の「Worker/Planner/Reviewer等」に対応する実行プロファイルである。

---

## 目的

- runner差（CLI/API、モデル指定等）を隠蔽し、runの再現性を高める。
- 役割ごとのプロンプトとデフォルト制約（exclude等）をDBで管理する。
- run開始時に「何を渡したか」を監査可能にする。

---

## Agent Profileの要素（論理モデル）

| 要素 | 例 | 説明 |
|------|----|------|
| name | coder | プロジェクト内で識別する名前 |
| runner | `claude-cli` | 実行手段 |
| model | `sonnet` | モデル名（任意） |
| prompt_template | role指示 | 役割としての固定指示 |
| default_exclude | `**/*.env` | デフォルト除外 |
| default_write_scope | `src/**` | タスク作成時の提案値（任意） |
| config | temperature等 | runner向け追加設定（任意） |

注:
- 実行可能範囲の最終決定はタスクのwrite_scopeで行う（→スコープ制御）。

---

## 組み込みプロファイル（例）

MVPではプロジェクト作成時に、最低限のプロファイルを用意できる。

| name | 想定役割 | 特徴 |
|------|----------|------|
| generalist | Worker | 汎用。判断困難な場合のデフォルト |
| planner | Planner | 分解・計画用（原則読み取り中心） |
| coder | Worker | 実装用 |
| reviewer | Reviewer | DoD/レビュー用（原則読み取り中心） |
| writer | Worker | docs更新用 |

注:
- 実際のwrite_scopeはタスクに必須で設定する。profileは提案値を持てる。

---

## run開始時の適用

run開始時、Daemonは以下を確定し、runの事実として記録する。

| 確定項目 | 参照元 | 記録先 |
|---------|--------|--------|
| 有効スコープ | task.write_scope + profile.default_exclude | runs.scope_snapshot |
| 最終プロンプト | profile.prompt_template + task情報 + 制約 | runログ（meta） |
| 実行環境 | runner/model/config | runs + runログ（meta） |

注:
- promptは監査のためrunログに`meta`として残す（→ログ保存、RunnerAdapter）。

---

## プロンプト構成（最小）

最終プロンプトは、少なくとも以下を含む。

| セクション | 内容 |
|-----------|------|
| 役割 | 何を達成する担当か |
| タスク | title/description、done条件 |
| 制約 | write_scope、exclude、禁止事項 |
| 出力 | 成果物の期待（例: 変更の要約、実行したチェック） |

注:
- runのstdout/stderrだけでなく、prompt等も「観測可能な事実」として残す。

---

## 割り当て（MVP）

MVPでは、run開始時にHumanがAgent Profileを選択する。
将来、Plannerが自動で割り当てる場合でも、割り当て結果はrunの事実として残す。

---

## 関連ドキュメント

- [データモデル](./data-model.md) - agent_profilesとrunsの関係
- [スコープ制御](./scope-control.md) - write_scope必須とscope snapshot
- [RunnerAdapter](./runner-adapter.md) - runner差の吸収と非対話実行
- [ログ保存](./log-storage.md) - prompt/出力の監査
- [プロンプト組み立て](./prompt-composition.md) - runner非依存の最終プロンプト生成
- [役割モデル（5層）](../02-architecture/role-model.md) - profileと役割の対応
