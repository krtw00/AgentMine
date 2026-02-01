---
depends_on:
  - ../02-architecture/structure.md
  - ./data-model.md
tags: [details, api, endpoints, rest]
ai_summary: "APIの対象リソースと認証方針（詳細は今後定義）"
---

# API設計

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、システムのAPI設計の方向性を定義する。
詳細なエンドポイントは今後確定する。

---

## API概要

| 項目 | 内容 |
|------|------|
| 目的 | Web UIとDaemon間の統一層 |
| ベースURL | `http://127.0.0.1:{port}`（MVP） |
| 認証方式 | なし（MVP: ローカル一人運用） |
| レスポンス形式 | JSON |

---

## 対象リソース

| リソース | 説明 |
|----------|------|
| projects | Project登録（Git repo） |
| tasks | タスク/イシュー管理 |
| task_dependencies | 依存関係管理 |
| agent_profiles | 実行プロファイル（runner/model/scope/DoD） |
| runs | 実行run/ログ |
| checks | DoD等の検証結果 |
| scope_violations | スコープ違反と承認状態 |
| settings | プロジェクト設定 |

---

## 操作の種別

| 種別 | 説明 |
|------|------|
| 読み取り | 一貫した状態の参照 |
| 変更 | Project/Task/依存/プロファイル/設定の更新 |
| 実行 | run start/stop/retry/continue、DoD実行、違反承認/却下 |

---

## 認証・認可

| 項目 | 方針 |
|------|------|
| 認証 | MVPでは行わない（localhost前提） |
| 認可 | MVPでは単一ユーザー想定。将来は役割に応じて制限する |

---

## エラー形式

| 種別 | 説明 |
|------|------|
| バリデーション | 入力不正 |
| 実行エラー | Worker/DoD実行の失敗 |
| 権限エラー | 役割不一致 |

---

## 関連ドキュメント

- [data-model.md](./data-model.md) - データモデル
- [flows.md](./flows.md) - 主要フロー
