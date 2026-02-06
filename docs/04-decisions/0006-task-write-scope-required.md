---
depends_on:
  - ../03-details/scope-control.md
  - ../03-details/data-model.md
tags: [decisions, adr, safety, scope]
ai_summary: "MVPではタスクのwrite_scopeを必須とし、runにscope_snapshotを保存することを決定する"
---

# ADR-0006: タスクのwrite_scopeを必須とし、scope_snapshotをrunに保存する

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

MVPからスコープ制御を導入する。
スコープは自由度を保ちたいが、デフォルト許可（`**/*`）は安全性が低い。
また、スコープのテンプレート（Project/agent profile）が後から変わると、過去runの評価が揺れる。

## 決定事項

MVPでは、タスクの `write_scope` を明示必須とする。
また、実行時の有効スコープはrunに `scope_snapshot` として保存する。

## 検討した選択肢

### 選択肢1: write_scopeを任意とし、デフォルトで広く許可（不採用）

- 長所: 入力が少なく、始めやすい
- 短所: 意図しない変更を防ぎにくい。安全性が低い

### 選択肢2: write_scopeを必須（採用）

- 長所: 安全性が高い。実行前に意図が明確になる
- 短所: タスク作成時の入力が増える

## 決定理由

- スコープ制御をMVPから実効性のあるものにするため
- 「自由にしたい」をテンプレ（Project/agent profile）で補い、最終許可はタスクで明示するため
- 再現性のため、評価基準（scope）をrunに固定するため

## 結果

### ポジティブな影響

- 被害範囲が限定される
- 過去runの評価がテンプレ変更で揺れない

### ネガティブな影響

- UIでの入力支援（テンプレ、候補提示）が必要になる

## 関連ADR

- [ADR-0004](./0004-agentmine-home-dir.md) - AgentMine Home
- [ADR-0005](./0005-continue-adds-new-run.md) - run単位の実行
