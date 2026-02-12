---
depends_on:
  - ./0005-continue-adds-new-run.md
tags: [decisions, adr, runner, adapter]
ai_summary: "claude/codexの差を吸収するRunnerAdapterの導入とI/Fを決定する"
---

# ADR-0009: RunnerAdapterを導入し、runner差を吸収する

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

MVPは `claude` と `codex` の両方を対象とする。
両者は引数、モデル指定、非対話実行の前提が異なる。
これらの差を上位層に露出させると、UIと状態管理が複雑になる。

## 決定事項

runner差はRunnerAdapterで吸収する。
RunnerAdapterはstart/stop等の最小I/Fを提供する。

## 検討した選択肢

### 選択肢1: runnerごとに処理を分岐（不採用）

- 長所: 早く作れる
- 短所: 分岐が増える。拡張時に破綻しやすい

### 選択肢2: RunnerAdapterを導入（採用）

- 長所: 上位層が単純になる。将来のAPI runner追加に耐える
- 短所: 抽象化の設計が必要になる

## 決定理由

- `claude`/`codex` 両対応をMVPから成立させるため
- runの事実収集（ログ/exit code）を一貫させるため

## 結果

### ポジティブな影響

- UIとDBのモデルがrunnerに依存しにくい
- 新runnerを追加しやすい

### ネガティブな影響

- runner固有機能の露出設計が必要になる

## 関連ドキュメント

- [RunnerAdapter](../03-details/runner-adapter.md) - RunnerAdapterの定義
