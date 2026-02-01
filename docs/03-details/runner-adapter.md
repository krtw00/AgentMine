---
depends_on:
  - ../02-architecture/structure.md
  - ../03-details/flows.md
  - ../03-details/log-storage.md
  - ../03-details/prompt-composition.md
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

## capabilitiesの意図

RunnerAdapterのcapabilitiesは「このrunnerで何ができるか」を機械可読に返すための情報である。
runner固有の機能差をUI/Daemonに直接持ち込まず、差分はcapabilitiesで吸収する。

capabilitiesの主な用途は以下である。

| 用途 | 目的 |
|------|------|
| UIの機能出し分け | 対応していない入力項目（例: model）を選べないようにする |
| 実行前バリデーション | 対応していない要求をrun開始前に拒否し、失敗理由を明確化する |

---

## capabilitiesは「入力の許容範囲」である

capabilitiesは、Agent Profileやrun開始入力が取りうる値の「許容範囲（制約）」である。

| 概念 | 役割 | 例 |
|------|------|----|
| Agent Profile | 「こう実行したい」という希望 | modelを指定したい |
| capabilities | 「それが実行手段として可能か」という制約 | supports_model=trueである |

原則:
- UIはcapabilitiesに基づき入力を制限する（選べない/表示しない）。
- Daemonはcapabilitiesで最終バリデーションする（UIの制限を信用しない）。

---

## capabilitiesの最小フィールド（MVP）

MVPで扱うcapabilitiesは最小限とし、runner差がある項目のみを露出する。

| フィールド | 型 | 意味 |
|-----------|----|------|
| supports_model | boolean | `model` を指定できるか |
| supports_non_interactive | boolean | 非対話実行が成立するか（自動承認等） |
| supports_prompt_file_inclusion | boolean | ファイル内容の埋め込み（添付）ができるか |

注:
- `supports_prompt_file_inclusion` は将来拡張のためのフィールドである。MVPでは使用しない（→プロンプト組み立て）。

---

## UIでの扱い（例）

| 例 | UIの挙動 | 理由 |
|----|----------|------|
| supports_model=false | model入力を非表示/無効化する | 不正入力を事前に防ぐ |
| supports_non_interactive=false | 「このrunnerは自動実行できない」を明示する | 実行方式の制約を可視化する |
| supports_prompt_file_inclusion=false | ファイル“内容”の添付UIを出さない | runner依存の添付を前提にしない |

注:
- MVPでは、プロンプトはrunner固有の添付に依存せず「パス列挙」を基本とする（→プロンプト組み立て）。

---

## バリデーション方針（MVP）

run開始時、DaemonはAgent Profile/入力とcapabilitiesの整合を検証する。
未対応の要求がある場合は、run開始前にエラーとして返す。

| 例 | 未対応capability | 挙動 |
|----|------------------|------|
| model指定あり | supports_model = false | 失敗（入力不正） |
| 非対話不可 | supports_non_interactive = false | 失敗（実行不可） |

---

## 将来拡張の方針

capabilitiesは将来拡張する。拡張は原則として後方互換（フィールド追加）で行う。

注:
- 追加フィールドは「UI出し分け」または「実行前バリデーション」のどちらに使うかを明記する。

---

## startの入力

| 項目 | 必須 | 説明 |
|------|:---:|------|
| run_id | ○ | 対象run |
| worktree_path | ○ | 実行ディレクトリ |
| prompt | ○ | 実行指示（固定文字列） |
| env | - | runnerに渡す環境変数 |
| model | - | runnerに渡すモデル名（runnerが対応する場合のみ） |

注:
- 監査と再現性のため、Daemonはstart直前にpromptをrunログの`meta`として記録する（→ログ保存）。

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
- [ログ保存](./log-storage.md) - promptと出力の追跡
- [プロンプト組み立て](./prompt-composition.md) - runner非依存のprompt生成
- [ADR-0005](../04-decisions/0005-continue-adds-new-run.md) - continue/retryは新run
- [ADR-0009](../04-decisions/0009-runner-adapter-interface.md) - RunnerAdapter I/F
