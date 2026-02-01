---
depends_on:
  - ../02-architecture/structure.md
  - ../03-details/flows.md
  - ../04-decisions/0005-continue-adds-new-run.md
  - ../04-decisions/0009-runner-adapter-interface.md
tags: [details, runner, adapter, execution]
ai_summary: "RunnerAdapterの責務、I/F、非対話実行の前提（claude/codex）を定義"
---

# RunnerAdapter

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、runner差を吸収するRunnerAdapterを定義する。
MVPでは `claude` と `codex` のCLIを対象とする。

---

## 目的

- runnerの差（引数、モデル指定可否等）を吸収する
- runの実行を一貫した事実として記録する
- stop/retry/continueをrunnerに依存させない

---

## 前提

| 項目 | 方針 |
|------|------|
| 実行形態 | 非対話である |
| 追加入力 | 同一プロセスへの追加入力を行わない |
| 作業ディレクトリ | worktreeである |

注:
- continue/retryは新しいrunを作成する（→ADR-0005）。

---

## RunnerAdapterのI/F（概念）

RunnerAdapterは以下の操作を提供する。

| 操作 | 入力 | 出力 | 説明 |
|------|------|------|------|
| start | run, prompt, env | process_handle | runnerを起動する |
| stop | process_handle | - | runnerを停止する |
| get_capabilities | - | capabilities | モデル指定可否等を返す |

---

## startの入力

| 項目 | 必須 | 説明 |
|------|:---:|------|
| run_id | ○ | 対象run |
| worktree_path | ○ | 実行ディレクトリ |
| prompt | ○ | 実行指示（固定文字列） |
| env | - | runnerに渡す環境変数 |
| model | - | runnerに渡すモデル名（runnerが対応する場合のみ） |

---

## 出力と観測可能な事実

RunnerAdapterが生成する主要な事実は以下である。

| 事実 | 例 | 用途 |
|------|----|------|
| 出力 | stdout/stderr | ログ表示、監査 |
| 終了 | exit code | run状態判定 |

注:
- 出力はログ保存に書き込み、同時にイベント配信する。

---

## `claude` と `codex` の差異（MVP）

| 観点 | `claude` | `codex` |
|------|----------|---------|
| 起動 | CLI | CLI |
| モデル指定 | 可能（runner依存） | 不可または限定的である |
| 非対話実行 | 自動承認フラグが必要である | full-auto相当が必要である |

注:
- 具体の引数は実装に委ねる。
- 非対話で実行できない場合はrunをfailedにする。

---

## 関連ドキュメント

- [主要フロー](./flows.md) - run開始とstop/retry/continue
- [主要コンポーネント構成](../02-architecture/structure.md) - Runner Manager
- [ADR-0005](../04-decisions/0005-continue-adds-new-run.md) - continue/retryは新run
- [ADR-0009](../04-decisions/0009-runner-adapter-interface.md) - RunnerAdapter I/F
