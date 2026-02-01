---
depends_on:
  - ./api.md
  - ./scope-control.md
  - ./observable-facts.md
tags: [details, authorization, security, roles]
ai_summary: "MVPの認証/認可方針と、操作（API）ごとの権限境界（人間/daemon/runner）を定義"
---

# 認証・認可（Authorization）

> Status: Draft
> 最終更新: 2026-02-01

本ドキュメントは、MVPにおける認証（Authentication）と認可（Authorization）の扱いを定義する。
MVPはローカル一人運用であり、強固な防御境界よりも「誤操作を減らす境界」を優先する。

---

## 前提（MVP）

| 項目 | 方針 |
|------|------|
| 認証 | しない（ログイン無し） |
| 利用者 | 同一PCの同一ユーザーのみ |
| 接続 | localhostのみ（外部公開しない） |

注:
- 認証を行わないため、MVPの「認可」は主に責務分離と誤操作防止のための仕様である。

---

## アクター（行為主体）

| アクター | 例 | 説明 |
|---------|----|------|
| Human User | ブラウザUI操作者 | すべての操作の最終責任を持つ主体 |
| Local Daemon | API/DB/実行管理 | DB更新とイベント配信を行う主体 |
| Runner Process | `claude`/`codex` CLI | worktreeで実行される外部プロセス |

---

## 権限境界（MVP）

### 基本ルール

- DBの更新はLocal Daemonのみが行う。
- Runner ProcessはDBに直接アクセスしない。
- 「承認/却下」はHuman Userのみが行う。

### 承認の対象

MVPで人間承認が必要となる代表例は以下である。

| 対象 | 理由 |
|------|------|
| スコープ違反の承認/却下 | write範囲外の変更は判断を要するため |

---

## 操作マトリクス（MVP）

### 書き込み操作

| 操作 | Human User | Local Daemon | Runner Process | 備考 |
|------|:---------:|:------------:|:--------------:|------|
| Project登録/更新 | ○ | ○ | × | UIはAPI経由で依頼する |
| Task作成/更新 | ○ | ○ | × | write_scope未設定のTaskは実行できない |
| run開始/stop | ○ | ○ | × | Runnerは起動対象であり操作主体ではない |
| スコープ違反の承認/却下 | ○ | ○ | × | humanのみの意思決定である |
| ログ削除 | ○ | ○ | × | 明示操作のみ |

### 参照操作

| 操作 | Human User | Local Daemon | Runner Process | 備考 |
|------|:---------:|:------------:|:--------------:|------|
| Task/Runの一覧・詳細 | ○ | ○ | × | UIはAPIで取得する |
| runログ閲覧 | ○ | ○ | × | ログは参照でありDBに格納しない |
| イベント購読（SSE） | ○ | ○ | × | UIは`/api/events`を購読する |

---

## 将来拡張（対象外）

| 追加要件候補 | 意味 |
|-------------|------|
| 認証 | トークン/SSO等により利用者を識別する |
| 役割（Role） | Owner/Operator/Reviewer等の権限を分離する |
| リモート接続 | localhost以外への公開と防御境界の定義 |

---

## 関連ドキュメント

- [API設計](./api.md) - UI/Daemon間のAPI
- [スコープ制御](./scope-control.md) - 違反検出と承認
- [観測可能な事実](./observable-facts.md) - humanのみの意思決定（例: cancelled）
