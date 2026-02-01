---
depends_on:
  - ../02-architecture/principles.md
  - ./data-model.md
tags: [details, observability, facts, status]
ai_summary: "観測可能な事実（Observable Facts）を定義し、task/runの状態を事実から自動判定するルールを示す"
---

# 観測可能な事実（Observable Facts）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、AgentMineが保持する「観測可能な事実」と、それに基づく状態の自動判定ルールを定義する。

---

## 基本方針

- 状態は人間/AIの自己申告ではなく、観測可能な事実から自動判定する。
- 「done」は **(1) baseブランチにマージ済み** かつ **(2) DoDがpassed** を満たすこととする。
- 例外として「cancelled」は意思決定であり、明示操作でのみ成立する。

---

## 事実（Facts）のカテゴリ

| カテゴリ | 例 | 主な用途 |
|---|---|---|
| プロセス事実 | exit code / signal / started_at / finished_at | run状態の判定 |
| Git事実 | worktree差分、変更ファイル一覧、merge判定 | スコープ違反検出、taskの完了判定 |
| DoD事実 | checkのexit code、log参照 | DoDのpassed/failed判定 |
| スコープ事実 | write範囲外の変更、excludeへのアクセス試行 | needs_reviewのトリガー |
| 手動決定 | cancelled、違反承認/却下 | 自動判定の例外処理 |

---

## 状態の自動判定（概要）

Web UI/APIは、以下の「派生状態」を表示/利用する。

| 対象 | 派生状態 | 備考 |
|---|---|---|
| run | running / completed / failed / cancelled | プロセス事実から判定 |
| task | open / blocked / ready / running / needs_review / done / failed / cancelled | 依存+観測事実から判定 |

注:
- `task.status` に加えて、「なぜその状態なのか」を示す理由（reason）を算出する。
- 理由はDBに保存せず、事実（runs/checks/scope_violations/git等）から都度導出する。

---

## run状態の判定

| run.status | 条件（観測可能な事実） |
|---|---|
| running | finished_at が null（かつプロセスが存在する/存在した） |
| completed | finished_at があり、exit_code = 0 |
| failed | finished_at があり、exit_code ≠ 0 または異常終了（signal等） |
| cancelled | 明示操作により cancelled_at がある |

---

## DoD（Definition of Done）状態の判定

DoDは「チェックの集合」として扱い、集計結果を task 判定に用いる。
チェック内容（何を必須とするか、どう実行するか）はプロジェクト設定で定義し、pnpm等に固定しない。
詳細は[DoD（Definition of Done）](./definition-of-done.md)（必須チェック定義と集計）を参照。

| dod.status | 条件 |
|---|---|
| pending | 必要なチェックが未実行、または集計不能 |
| passed | 必要なチェックがすべて成功（exit code = 0） |
| failed | 1つでも失敗（exit code ≠ 0） |

注:
- `dod.status` はrunごとに算出できる（checksの集計）。
- taskのdone判定では「baseブランチに含まれるrun（`head_sha`）」のDoD結果を根拠にする。

---

## merge状態の判定

| merge.status | 条件 |
|---|---|
| not_merged | taskの作業ブランチがbaseブランチに未マージ |
| merged | taskの作業ブランチがbaseブランチにマージ済み |

注: 判定はGitの事実（例: `git merge-base` / `git log` など）に依存し、ホスティング（GitHub等）には依存しない。
注: DoDの「統合済み」判定にはrunの`head_sha`がbaseブランチに到達している事実を用いる。

---

## スコープ違反の扱い（レビュー優先モード）

スコープ違反は「防ぐ」だけでなく、「検出してレビュー可能にする」ことを重視する。

| 事象 | 記録 | taskへの影響 |
|---|---|---|
| write範囲外への変更 | scope_violations に記録 | needs_review |
| exclude対象へのアクセス/変更試行 | scope_violations に記録 | needs_review |
| 違反の承認 | **Humanのみ**がdecisionとして記録 | needs_review解除の候補 |

---

## task状態の判定（優先順位）

以下は「表示用の集約状態」であり、元データは runs/checks/git/scope の事実に残す。

### 判定に使う中間値

| 名称 | 定義 |
|------|------|
| latest_run | `started_at` が最大のrun |
| latest_run_dod | latest_run のchecksを集計したDoD状態 |
| merged_passed_run_exists | baseブランチが `head_sha` を含み、DoDがpassedのrunが存在する |

| 優先順位 | 条件 | task.status |
|---:|---|---|
| 1 | cancelled_at がある | cancelled |
| 2 | 依存タスクが未完了 | blocked |
| 3 | running な run が存在 | running |
| 4 | 未承認（pending）の scope violation が存在 | needs_review |
| 5 | 却下（rejected）の scope violation が存在 | needs_review |
| 6 | merged_passed_run_exists が true | done |
| 7 | merge.status = merged かつ done条件を満たさない | needs_review |
| 8 | latest_run_dod = failed（かつ running なし） | failed |
| 9 | run が1つ以上あり、completed が存在（かつ doneでない） | ready |
| 10 | run がない | open |

注:
- `ready` は「実行は終わったが、done条件（merge+DoD）を満たしていない」状態を表す作業用ステータスである。
- `needs_review` の解釈は「人間/上位AIが介入すべき」。
- `rejected` は意思決定の結果であり、failedに落とさず「介入理由」として残す（観測可能な事実ベースの判定を保つ）。

---

## task理由（reason codes）

taskの集約状態に対して、Web UI/APIで共通利用できる「理由コード」を定義する。
理由は複数同時に成立しうる（配列）前提とする。

| code | 意味 | 代表的な根拠（事実） |
|---|---|---|
| blocked_by_dependencies | 依存未完了で実行できない | task_dependenciesの未完了 |
| scope_violation_pending | スコープ違反が承認待ち | scope_violations.approved_status = pending |
| scope_violation_rejected | スコープ違反が却下済み | scope_violations.approved_status = rejected |
| dod_pending | 必須チェックが未完了 | checksの不足、集計不能 |
| dod_failed | 必須チェックが失敗 | checks.status = failed |
| merge_pending | 未マージ | merge.status = not_merged |
| run_failed | 失敗runがあり止まっている | runs.status = failed（かつ running なし） |

注:
- 複合コード（例: `merged_but_dod_pending`）は定義しない。必要なら複数理由の組み合わせで表現する。
- 各理由に紐づく詳細（対象ID/パス/チェック名等）は、別途事実の参照（例: `scope_violations` 一覧、`checks` 一覧）で辿れることを前提とする。

---

## 関連ドキュメント

- [設計原則](../02-architecture/principles.md) - 観測可能な事実/再現性優先の原則
- [データモデル](./data-model.md) - factsを保持するエンティティ定義
- [スコープ制御](./scope-control.md) - スコープの物理制約と違反の検出・レビュー
