---
depends_on:
  - ./api.md
  - ../02-architecture/tech-stack.md
  - ../04-decisions/0007-event-stream-uses-sse.md
tags: [details, events, sse, streaming]
ai_summary: "Web UIへのイベント配信方式（SSE）、イベント種別、再接続方針を定義"
---

# イベント配信（Event Stream）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、Web UIへのイベント配信を定義する。
MVPではSSE（Server-Sent Events）を採用する。

---

## 目的

- runログをリアルタイム表示する
- 状態変化をUIへ即時反映する
- ポーリングを必須にしない

---

## 接続方式

| 項目 | 方針 |
|------|------|
| プロトコル | SSE |
| エンドポイント | `GET /api/events` |
| 方向 | サーバ→クライアントの単方向 |
| 再接続 | Web UIが自動で再接続する |

注:
- 再接続後、Web UIは必要な状態をAPIで再取得する。
- MVPではイベントの永続バックログは持たない。

---

## イベント種別（MVP）

| event | 発生条件 | 主な用途 |
|-------|----------|----------|
| run.output | stdout/stderr/metaの出力が出た | ログ表示 |
| run.status_changed | runの状態が変わった | 実行状態の反映 |
| check.status_changed | checkの状態が変わった | DoD結果の反映 |
| scope_violation.created | scope違反を検出した | 承認待ちの提示 |
| scope_violation.decided | 承認/却下が確定した | needs_reviewの反映 |

---

## イベントの共通フィールド

イベントのdataはJSONである。
すべてのイベントは共通フィールドを持つ。

| フィールド | 必須 | 説明 |
|-----------|:---:|------|
| id | ○ | イベントID（単調増加） |
| type | ○ | event種別 |
| timestamp | ○ | 発生時刻 |

---

## run.output

| フィールド | 必須 | 説明 |
|-----------|:---:|------|
| run_id | ○ | 対象run |
| stream | ○ | stdout / stderr / meta |
| data | ○ | 出力テキスト |

注:
- 受信済みログの正はログファイルである（→ログ保存）。

---

## エラー時の扱い

| 事象 | 挙動 |
|------|------|
| SSE切断 | Web UIが再接続する |
| Daemon再起動 | Web UIが状態を再取得する |
| イベント欠落 | Web UIがrun詳細とログを再取得する |

---

## 関連ドキュメント

- [API設計](./api.md) - エンドポイント
- [技術スタック](../02-architecture/tech-stack.md) - SSE採用理由
- [ADR-0007](../04-decisions/0007-event-stream-uses-sse.md) - SSE採用
- [ログ保存](./log-storage.md) - ログの正
