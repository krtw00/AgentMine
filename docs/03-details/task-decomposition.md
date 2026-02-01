---
depends_on:
  - ../02-architecture/role-model.md
  - ./data-model.md
  - ./flows.md
  - ./business-rules.md
tags: [details, planning, decomposition, tasks, dependencies]
ai_summary: "Plannerによるタスク分解の目的・判定基準・分解パターン・DBへの反映（親子/依存）を定義"
---

# タスク分解（Task Decomposition）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、大きな依頼を並列実行可能な粒度のタスクへ分解するためのルールを定義する。
タスク分解は役割モデル上のPlannerの責務である。

---

## 目的

- 並列化可能な単位へ分割し、進捗と責任範囲を明確化する。
- 失敗時に差し戻し先（指示/計画側）を明確にする。
- 「1タスク=1run/1成果物」へ近づけ、観測可能な事実で状態を追跡しやすくする。

---

## 分解の判定基準（シンプルルール）

Plannerは複雑なスコア計算ではなく、以下の自問で分解を判断する。

| 自問 | 回答 | 判定 |
|------|------|------|
| 1つのコミット（または差分）として説明できるか | No | 分解する |
| 複数の独立した変更が含まれるか | Yes | 分解する |
| 1人が短時間でレビューできるか | No | 分解する |

注:
- 「短時間」は時間数の固定値ではなく、レビュー容易性で判断する。

---

## 分解パターン

| パターン | 分解方法 | 例 |
|---------|---------|-----|
| レイヤー跨ぎ | DB → API → UI に分ける | 認証 → スキーマ、API、画面 |
| 機能複合 | 機能A/機能Bへ分ける | ユーザー管理 → 登録、編集、削除 |
| CRUD | Create/Read/Update/Deleteで分ける | 記事API → 各操作 |

---

## 分解の成果（DBへの反映）

分解の成果は「子タスク」と「依存関係」で表現する。

| 成果物 | 反映先 | 説明 |
|--------|--------|------|
| 親子関係 | tasks.parent_id | 分解元を追跡する |
| 依存関係 | task_dependencies | 実行順序の制約を表現する |
| 実行範囲 | tasks.write_scope | 子タスクごとに必須で定義する |

注:
- 追加メタ情報（複雑度、タスク種別等）はMVPでは必須にしない。
- 追加メタ情報が必要になった場合は、DBの拡張（settingsや専用テーブル）で扱う。

---

## 分解フロー（概念）

```mermaid
sequenceDiagram
    actor H as Human
    participant O as Orchestrator
    participant P as Planner
    participant A as AgentMine

    H->>O: 依頼（大タスク）
    O->>A: 親タスク作成
    O->>P: 分解依頼（任意）
    P->>P: 分解（子タスク+依存）
    P->>A: 子タスク作成 + 依存登録
    P->>O: 分解結果を報告
```

注:
- MVPでは、HumanがPlanner相当の作業（子タスクと依存の登録）をUIで行ってもよい。

---

## NG時の再計画

NGはWorkerへ差し戻さず、Plannerが計画を更新する。
再計画は「タスク定義を修正し、新runで再実行する」ことを基本とする。

| NG原因 | Plannerの対応 |
|--------|----------------|
| 指示が曖昧 | descriptionを具体化し、必要なら再分解する |
| 粒度が大きい | 子タスクを追加し、依存を再設計する |
| 依存が誤り | task_dependenciesを修正する |
| 検証失敗 | 失敗理由をタスクへ反映し、再実行する |

---

## 関連ドキュメント

- [役割モデル（5層）](../02-architecture/role-model.md) - Planner/Supervisorの責務
- [データモデル](./data-model.md) - 親子/依存の表現
- [業務ルール](./business-rules.md) - 不変条件と同時実行制約
- [主要フロー](./flows.md) - タスク作成とrun開始
