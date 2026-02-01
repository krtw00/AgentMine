---
depends_on:
  - ../02-architecture/principles.md
  - ../03-details/observable-facts.md
tags: [decisions, adr, status, dod]
ai_summary: "タスクのdoneを「マージ済み」かつ「DoD passed」で自動判定することを決定する"
---

# ADR-0002: Definition of Doneは「マージ」かつ「DoD passed」で判定する

> Status: Accepted
> 最終更新: 2026-02-01

## コンテキスト

AgentMineは「観測可能な事実」に基づき、状態を自動判定する設計である。
このとき、タスクの完了（done）を何の事実で判定するかが必要となる。

## 決定事項

タスクの done は以下を **両方** 満たす場合に成立する。

1. baseブランチにマージ済み（merge.status = merged）
2. DoDが passed（dod.status = passed）

## 検討した選択肢

### 選択肢1: マージのみでdone

- 長所: シンプルで運用が軽い
- 短所: 品質ゲートが弱く、再現性のある完了基準になりにくい

### 選択肢2: DoDのみでdone

- 長所: 品質中心の完了になる
- 短所: マージされない限り成果が統合されず、プロジェクト管理上の完了とズレる

### 選択肢3: マージ + DoD（採用）

- 長所: 「統合された」かつ「検証された」を同時に満たす
- 短所: DoD定義/実行の整備が必要

## 決定理由

- done基準のブレをなくし、再現性を優先するため
- Web UI（監視・介入）で「何が足りないか」を明確に表示できるため

## 結果

### ポジティブな影響

- doneが曖昧にならず、監査・自動化がしやすい
- Web UI/APIで同一の基準を共有できる

### ネガティブな影響

- DoD Runner/チェック記録の実装が必須になる

## 関連ADR

- なし

## 関連ドキュメント

- [設計原則](../02-architecture/principles.md) - 観測可能な事実/再現性優先
- [観測可能な事実](../03-details/observable-facts.md) - 自動判定ルール
